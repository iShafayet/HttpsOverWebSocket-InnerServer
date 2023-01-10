import http from "http";
import constants from "../constant/common-constants.js";
import { Config } from "../lib/config.js";
import { Transmission } from "../lib/transmission.js";
import {
  HisToHosMessage,
  HisToHosMessageType,
  HosToHisMessage,
} from "../types/types.js";
import { sleep } from "./misc-utils.js";

export const readBodyChunk = (
  res: http.IncomingMessage
): Promise<[Buffer, boolean]> => {
  return new Promise(async (accept, reject) => {
    let chunks: Buffer[] = [];

    let times = 10;
    while (times--) {
      if (!res.readable) break;
      let chunk = res.read(constants.data.CHUNK_SIZE_BYTES);
      if (chunk) {
        chunks.push(chunk);
      }
      await sleep(10);
    }

    accept([Buffer.concat(chunks), res.readable]);
  });
};

export const packMessage = (message: HisToHosMessage): string => {
  return JSON.stringify(message);
};

export const unpackHosToHisMessage = (message: string): HosToHisMessage => {
  return JSON.parse(message);
};

export const createHttpOrHttpsConnection = (
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

export const writeData = (
  req: http.ClientRequest,
  body: string
): Promise<void> => {
  return new Promise((accept, reject) => {
    let bodyBuffer = Buffer.from(body, "base64");
    req.write(bodyBuffer, (err) => {
      if (err) return reject(err);
      accept();
    });
  });
};

export const sendMessageRequestingMoreRequestData = async (
  transmission: Transmission
) => {
  let message: HisToHosMessage = {
    uuid: transmission.uuid!,
    serial: transmission.serial!,
    type: HisToHosMessageType.WantsMoreRequestData,

    statusCode: null,
    headers: null,
    body: null,
    hasMore: false,
  };

  logger.debug("TRANSMISSION: hisToHos message", message);

  transmission.sendMessage(message);
};

export const sendFirstMessageWithResponseData = async (
  transmission: Transmission,
  req: http.ClientRequest,
  res: http.IncomingMessage
) => {
  let headers = res.headers!;

  let hasMore: boolean;
  let bodyBuffer: Buffer;
  [bodyBuffer, hasMore] = await readBodyChunk(res);

  let body = bodyBuffer.toString("base64");

  let message: HisToHosMessage = {
    uuid: transmission.uuid!,
    serial: transmission.serial!,
    type: HisToHosMessageType.ContainsResponseData,

    statusCode: res.statusCode!,
    headers: headers as Record<string, string>,

    body,
    hasMore,
  };

  logger.debug("TRANSMISSION: hisToHos message with data (first)", message);

  transmission.sendMessage(message);
};

export const sendSubsequentMessageWithMoreResponseData = async (
  transmission: Transmission,
  req: http.ClientRequest,
  res: http.IncomingMessage
) => {
  let hasMore: boolean;
  let bodyBuffer: Buffer;
  [bodyBuffer, hasMore] = await readBodyChunk(res);

  let body = bodyBuffer.toString("base64");

  let message: HisToHosMessage = {
    uuid: transmission.uuid!,
    serial: transmission.serial!,
    type: HisToHosMessageType.ContainsResponseData,

    statusCode: null,
    headers: null,

    body,
    hasMore,
  };

  logger.debug(
    "TRANSMISSION: hisToHos message with data (subsequent)",
    message
  );

  transmission.sendMessage(message);
};
