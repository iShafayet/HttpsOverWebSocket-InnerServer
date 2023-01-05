import wsModule, { WebSocket } from "ws";
import http from "http";
import https from "https";
import url from "url";
import constants from "../constant/common-constants.js";
import { sleep, writeToStream } from "../utility/misc-utils.js";
import crypto from "crypto";
import {
  HisToHosMessage,
  HisToHosMessageType,
  HisWebSocket,
  HosToHisMessage,
  HosToHisMessageType,
  HosTransmission,
  HosTransmissionInternalState,
} from "../types/types.js";
import {
  parseAndValidateIncomingMessage,
  sendFirstMessage,
  sendSubsequentMessageRequestingMoreData,
  sendSubsequentMessageWithMoreData,
  unpackHisToHosMessage,
  unpackHosToHisMessage,
} from "../utility/transmission-helper.js";
import { Config } from "./config.js";

// },
// (res) => {
//   let data = "";

//   res.on("data", (chunk) => {
//     data += chunk;
//   });

//   // Ending the response
//   res.on("end", () => {
//     console.log("Body:", JSON.parse(data));
//   });
// }
// )
// .on("error", (err) => {
// console.log("Error: ", err);
// })
// .end();

let createHttpOrHttpsConnection = (
  config: Config,
  path: string,
  method: string,
  headers: Record<string, string>
): Promise<http.ClientRequest> => {
  return new Promise((accept, reject) => {
    let url = new URL(config.localServer.url);
    const req = http.request({
      protocol: url.protocol,
      port: url.port,
      hostname: url.hostname,
      path,
      method,
      headers,
    });
    return accept(req);
  });
};

const writeData = (req: http.ClientRequest, body: string): Promise<void> => {
  return new Promise((accept, reject) => {
    let bodyBuffer = Buffer.from(body, "base64");
    req.write(bodyBuffer, (err) => {
      if (err) return reject(err);
      accept();
    });
  });
};

export const handleTransmission = async (config: Config, ws: HisWebSocket) => {
  let req: http.ClientRequest;
  let res: http.IncomingMessage;

  ws.on("message", async (messageString: string) => {
    let message: HosToHisMessage = unpackHosToHisMessage(messageString);
    logger.debug(`TRANSMISSION: ${ws.uid}: Message received`, message);

    if (message.type === HosToHisMessageType.ContainsRequestData) {
      if (message.serial === 0) {
        req = await createHttpOrHttpsConnection(
          config,
          message.url!,
          message.method!,
          message.headers!
        );

        req.on("response", (_res: http.IncomingMessage) => {
          res = _res;
        });
      }
      if (message.body && message.body?.length > 0) {
        await writeData(req, message.body);
      }
      if (message.hasMore) {
        ("RequestMoreRequestData");
      } else {
        req.end();
      }
    } else if (message.type === HosToHisMessageType.WantsMoreResponseData) {
      ("SendMoreResponseData");
    } else if (
      message.type === HosToHisMessageType.NotifyingEndOfTransmission
    ) {
      ("EndConnection");
    }
  });
};
