import { Config } from "./lib/config.js";
import { OutgoingConnectionPool } from "./lib/connection-pool.js";
import { Transmission } from "./lib/transmission.js";
import { HisWebSocket } from "./types/types.js";

export const startHisServer = async (config: Config) => {
  let wsPool = new OutgoingConnectionPool(config, {
    ...config.outgoingConnection,
    reconnectionDelayOnFail: 5_000,
    reconnectionDelayOnDisconnect: 100,
    hosUrl: config.outerServer.url,
  });

  wsPool.setTransmissionHandler((config: Config, ws: HisWebSocket) => {
    logger.log(`SERVER: ${ws.uid}: Instanciating a <Transmission>.`);
    let transmission = new Transmission(config, ws);
    transmission.start();
  });

  await wsPool.start();
};
