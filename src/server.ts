import https from "https";
import http from "http";
import fs from "fs";
import wsModule, { WebSocketServer } from "ws";
import { Config } from "./lib/config.js";
import { AddressInfo } from "net";
import { OutgoingConnectionPool } from "./lib/connection-pool.js";
import { handleTransmission } from "./lib/handle-transmission.js";
import { CodedError } from "./utility/coded-error.js";
import { ErrorCode } from "./constant/error-codes.js";

let wss: wsModule.Server<wsModule.WebSocket>;

export const startHisServer = async (config: Config) => {
  let wsPool = new OutgoingConnectionPool(config, {
    ...config.outgoingConnection,
    reconnectionDelayOnFail: 5_000,
    reconnectionDelayOnDisconnect: 100,
    hosUrl: config.outerServer.url,
  });

  wsPool.setTransmissionHandler(handleTransmission);

  await wsPool.start();
};
