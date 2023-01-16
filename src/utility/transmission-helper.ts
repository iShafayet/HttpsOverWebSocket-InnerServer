import http from "http";
import constants from "../constant/common-constants.js";
import { Config } from "../lib/config.js";
import { Transmission } from "../lib/transmission.js";
import {
  HisToHosMessage,
  HisToHosMessageType,
  HosToHisMessage,
  HosToHisMessageType,
} from "../types/types.js";
import { UserError } from "./coded-error.js";
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

export const unpackHosToHisMessage = (
  messageString: string
): [string, HosToHisMessage] => {
  let [pssk, uuid, serial, type, message] = parseHosToHisMessage(messageString);
  message.uuid = uuid;
  message.serial = serial;
  message.type = type;

  return [pssk, message];
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

  await transmission.sendMessage(message);
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

  await transmission.sendMessage(message);
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

  await transmission.sendMessage(message);
};

export const parseHosToHisMessage = (
  rawMessage: string
): [string, string, number, HosToHisMessageType, HosToHisMessage] => {
  const MINIMUM_LENGTH = 20;
  if (rawMessage.length < MINIMUM_LENGTH) {
    throw new UserError("INVALID_MESSAGE", "Message is too short");
  }

  let index = rawMessage.indexOf("}");
  if (index === -1) {
    throw new UserError("INVALID_MESSAGE", "Message is malformatted. (Case 1)");
  }

  let lhs = rawMessage.slice(0, index + 1);
  let rhs = rawMessage.slice(index + 1);

  lhs = lhs.slice(1, lhs.length - 1);
  let [pssk, uuid, serial, type] = lhs.split(",");

  let message = JSON.parse(rhs);

  return [pssk, uuid, parseInt(serial), type as HosToHisMessageType, message];
};

export const prepareHisToHosMessage = (
  pssk: string,
  uuid: string,
  serial: number,
  type: HisToHosMessageType,
  message: HisToHosMessage
): string => {
  let rawMessage =
    `{${pssk},${uuid},${serial},${type}}` + JSON.stringify(message);
  return rawMessage;
};
