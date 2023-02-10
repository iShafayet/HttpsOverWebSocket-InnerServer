import wsModule, { WebSocket } from "ws";
import constants from "../constant/common-constants.js";
import { ErrorCode } from "../constant/error-codes.js";
import { HisWebSocket } from "../types/types.js";
import { CodedError } from "../utility/coded-error.js";
import { Config } from "./config.js";

export class OutgoingConnectionPool {
  private uidSeed = 0;
  private connectionMap!: Map<string, HisWebSocket>;
  private pendingConnectionMap!: Map<string, boolean>;

  maxCount: number;
  minCount: number;
  reconnectionDelayOnFail!: number;
  reconnectionDelayOnDisconnect!: number;
  hosUrl: string;
  handleTransmissionFn:
    | ((config: Config, ws: HisWebSocket) => void)
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
    this.pendingConnectionMap = new Map<string, boolean>();
  }

  private getNewUid(): string {
    return `his${this.uidSeed++}`;
  }

  private computeNumberOfConnectionsThatCanBeMade(): number {
    return Math.max(
      this.minCount - this.connectionMap.size - this.pendingConnectionMap.size,
      0
    );
  }

  openANewConnection() {
    let connectionsToOpen = this.computeNumberOfConnectionsThatCanBeMade();
    if (connectionsToOpen === 0) {
      logger.log(`CPOOL: Maximum number of connections has been reached.`);
      return;
    }

    return new Promise((accept, reject) => {
      let wasOpened = false;

      const uid = this.getNewUid();
      logger.log(
        `CPOOL: Opening new connection to ${this.hosUrl} with UID: ${uid}`
      );

      try {
        let ws: HisWebSocket = new WebSocket(this.hosUrl) as HisWebSocket;
        ws.uid = uid;
        this.pendingConnectionMap.set(ws.uid, true);

        let pingTimeout: NodeJS.Timeout;
        const checkIfIdle = () => {
          logger.log(`CPOOL: ${uid}: Checking if idle.`);

          if (
            ws.lastReceiveEpoch + constants.socketIdleRejectionThreshold <
            Date.now()
          ) {
            logger.log(`CPOOL: ${uid}: Found to be idle. Terminating.`);
            ws.terminate();
          }

          clearTimeout(pingTimeout);
          pingTimeout = setTimeout(
            checkIfIdle,
            constants.pruningAttemptInterval
          );
        };

        ws.once("open", () => {
          logger.log(`CPOOL: ${uid}: Connection successfully established.`);
          this.pendingConnectionMap.delete(ws.uid);
          this.connectionMap.set(ws.uid, ws);
          wasOpened = true;
          ws.lastReceiveEpoch = Date.now();
          checkIfIdle();
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
          clearTimeout(pingTimeout);
        });

        ws.once("close", (code, reason) => {
          logger.log(
            `CPOOL: ${uid}: Connection was closed. Requesting new connection to be made after delay.`
          );
          this.connectionMap.delete(ws.uid);
          this.pendingConnectionMap.delete(ws.uid);
          this.handlePreviouslySuccessfulConnectionClosure();
          clearTimeout(pingTimeout);
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
      this.reportConnectionStatus();
    }
  }

  async start() {
    logger.log(`CPOOL: Start`);
    this.reportConnectionStatus();
    await this.tryOpeningNecessaryConnections();
    this.reportConnectionStatus();
  }

  setTransmissionHandler(
    handleTransmissionFn: (config: Config, ws: HisWebSocket) => void
  ) {
    this.handleTransmissionFn = handleTransmissionFn;
  }

  reportConnectionStatus() {
    let message = `Connections: ${this.connectionMap.size}, pending connections: ${this.pendingConnectionMap.size}`;
    logger.debug(`CPOOL: ${message}`);
  }
}
