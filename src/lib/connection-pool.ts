import wsModule, { WebSocket } from "ws";
import { ErrorCode } from "../constant/error-codes.js";
import { HisWebSocket } from "../types/types.js";
import { CodedError } from "../utility/coded-error.js";
import { Config } from "./config.js";

export class OutgoingConnectionPool {
  private uidSeed = 0;
  private connectionMap!: Map<string, HisWebSocket>;

  maxCount: number;
  minCount: number;
  reconnectionDelayOnFail!: number;
  reconnectionDelayOnDisconnect!: number;
  hosUrl: string;
  handleTransmissionFn:
    | ((config: Config, ws: HisWebSocket) => Promise<void>)
    | undefined;
  config: Config;

  constructor(
    config: Config,
    {
      maxCount,
      minCount,
      reconnectionDelayOnDisconnect,
      reconnectionDelayOnFail,
      hosUrl,
    }: {
      maxCount: number;
      minCount: number;
      reconnectionDelayOnFail: number;
      reconnectionDelayOnDisconnect: number;
      hosUrl: string;
    }
  ) {
    this.maxCount = maxCount;
    this.minCount = minCount;
    this.reconnectionDelayOnFail = reconnectionDelayOnFail;
    this.reconnectionDelayOnDisconnect = reconnectionDelayOnDisconnect;
    this.hosUrl = hosUrl;

    this.config = config;

    this.connectionMap = new Map<string, HisWebSocket>();
  }

  private getNewUid(): string {
    return `his${this.uidSeed++}`;
  }

  private computeNumberOfConnectionsThatCanBeMade(): number {
    return Math.max(this.minCount - this.connectionMap.size - 0);
  }

  openANewConnection() {
    return new Promise((accept, reject) => {
      let wasOpened = false;

      const uid = this.getNewUid();
      logger.log(
        `CPOOL: Opening new connection to ${this.hosUrl} with UID: ${uid}`
      );

      try {
        let ws: HisWebSocket = new WebSocket(this.hosUrl) as HisWebSocket;
        ws.uid = uid;

        ws.once("open", () => {
          logger.log(`CPOOL: ${uid}: Connection successfully established`);
          this.connectionMap.set(ws.uid, ws);
          wasOpened = true;
          this.handleTransmissionFn!(this.config, ws);
          accept(ws);
        });

        ws.once("error", (err) => {
          logger.log(
            `CPOOL: ${uid}: The following error occurred regarding a connection.`
          );
          logger.error(err);

          // We only want to reject if the error occurs during opening the connection.
          if (!wasOpened) {
            reject(err);
          }
        });

        ws.once("close", (code, reason) => {
          logger.log(
            `CPOOL: ${uid}: Connection was closed. Requesting new connection to be made after delay.`
          );
          this.connectionMap.delete(ws.uid);
          this.handlePreviouslySuccessfulConnectionClosure();
        });
      } catch (ex) {
        logger.log(
          `CPOOL: ${uid}: The following error occurred while opening a connection.`
        );
        logger.error(ex as Error);
        reject(ex);
      }
    });
  }

  async handlePreviouslySuccessfulConnectionClosure() {
    try {
      setTimeout(() => {
        this.tryOpeningNecessaryConnections();
      }, this.reconnectionDelayOnFail);
    } catch (ex) {
      ("pass");
    }
  }

  async tryOpeningNecessaryConnections() {
    let connectionsToOpen = this.computeNumberOfConnectionsThatCanBeMade();
    for (let i = 0; i < connectionsToOpen; i++) {
      await this.openANewConnection();
    }
  }

  async start() {
    logger.log(`CPOOL: Start`);
    await this.tryOpeningNecessaryConnections();
  }

  setTransmissionHandler(
    handleTransmissionFn: (config: Config, ws: HisWebSocket) => Promise<void>
  ) {
    this.handleTransmissionFn = handleTransmissionFn;
  }
}
