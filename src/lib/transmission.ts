import http from "http";
import {
  HisToHosMessage,
  HisWebSocket,
  HosToHisMessage,
  HosToHisMessageType,
} from "../types/types.js";
import { CodedError } from "../utility/coded-error.js";
import {
  createHttpOrHttpsConnection,
  prepareHisToHosMessage,
  sendFirstMessageWithResponseData,
  sendMessageRequestingMoreRequestData,
  sendSubsequentMessageWithMoreResponseData,
  unpackHosToHisMessage,
  writeData,
} from "../utility/transmission-helper.js";
import { Config } from "./config.js";

class Transmission {
  private config: Config;
  private ws: HisWebSocket;

  private req?: http.ClientRequest;
  private res?: http.IncomingMessage;

  uuid?: string;
  serial = 0;

  constructor(config: Config, ws: HisWebSocket) {
    this.config = config;
    this.ws = ws;
  }

  public start() {
    if (!this.ws.OPEN) {
      return this.die(
        new CodedError("TRANSMISSION_STARTED_WITHOUT_OPENING_SOCKET")
      );
    }

    this.ws.on("message", (messageString: string, isBinary) => {
      messageString = isBinary ? messageString : messageString.toString();

      logger.log("RAW MESSAGE", messageString);
      let message: HosToHisMessage = unpackHosToHisMessage(messageString);
      logger.debug(`TRANSMISSION: ${this.ws.uid}: Message received`, message);

      this.handleMessage(message);
    });
  }

  private async handleMessage(message: HosToHisMessage) {
    try {
      if (message.serial !== this.serial + 1) {
        logger.warn(
          new Error(
            `Serial mismatch found. HosToHisMessage.serial must be strictly one more than previous message's serial.` +
              `Received serial: ${message.serial}, Previous serial: ${this.serial}`
          )
        );
        return;
      }
      this.uuid = message.uuid;
      this.serial = message.serial;

      if (message.type === HosToHisMessageType.ContainsRequestData) {
        await this.handleMessageThatContainsRequestData(message);
      } else if (message.type === HosToHisMessageType.WantsMoreResponseData) {
        await this.handleMessageThatWantsMoreResponseData(message);
      } else if (
        message.type === HosToHisMessageType.NotifyingEndOfTransmission
      ) {
        await this.handleMessageThatIsNotifyingEndOfTransmission(message);
      }
    } catch (ex) {
      this.die(ex as Error);
    }
  }

  private async handleMessageThatContainsRequestData(message: HosToHisMessage) {
    if (message.serial === 1) {
      this.req = await createHttpOrHttpsConnection(
        this.config,
        message.url!,
        message.method!,
        message.headers!
      );

      this.req.once("error", (ex) => this.die(ex));

      this.req.once("response", (res: http.IncomingMessage) => {
        logger.debug("RESPONSE IS HERE");
        this.res = res;
        this.res.once("error", (ex) => this.die(ex));

        sendFirstMessageWithResponseData(this, this.req!, this.res!);
      });
    }
    if (message.body && message.body?.length > 0) {
      await writeData(this.req!, message.body);
    }
    if (message.hasMore) {
      await sendMessageRequestingMoreRequestData(this);
    } else {
      this.req!.end();
    }
  }

  private async handleMessageThatWantsMoreResponseData(
    message: HosToHisMessage
  ) {
    sendSubsequentMessageWithMoreResponseData(this, this.req!, this.res!);
  }

  private async handleMessageThatIsNotifyingEndOfTransmission(
    message: HosToHisMessage
  ) {
    this.endAndCleanUp();
  }

  private endAndCleanUp() {
    try {
      if (this.req && this.req.writable) {
        this.req.end();
      }
    } catch (ex) {
      ("pass");
    }

    try {
      if (this.res && this.res.readable) {
        this.res.destroy();
      }
    } catch (ex) {
      ("pass");
    }

    try {
      if (this.ws && this.ws.OPEN) {
        this.ws.close();
      }
      this.ws.removeAllListeners("message");
    } catch (ex) {
      ("pass");
    }
  }

  // Quitely log error and close connections if open.
  // We do not want to raise the errors to the root level.
  private die(ex: Error) {
    logger.error(ex);
    this.endAndCleanUp();
  }

  public sendMessage(message: HisToHosMessage) {
    this.serial += 1;
    message.serial += 1;

    let messageString = prepareHisToHosMessage(
      message.uuid,
      message.serial,
      message.type,
      message
    );

    this.ws.send(messageString);
  }
}

export { Transmission };
