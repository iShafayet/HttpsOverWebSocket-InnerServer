// Patch webcrypto for nodejs 18 LTS
import webcrypto from "node:crypto";
// @ts-ignore
globalThis.crypto = webcrypto;

import { Config } from "./lib/config.js";
import { startHisServer } from "./server.js";

export class HttpsOverWebSockerOuterServer {
  config!: Config;

  async start(config: Config) {
    try {
      this.config = config;
      await this._initialize();
    } catch (ex) {
      logger.log("Error was propagated to root level. Throwing again.");
      throw ex;
    }
  }

  async _initialize() {
    startHisServer(this.config);
  }
}

process.on("uncaughtException", function (err) {
  console.log("Suppressing uncaughtException");
  console.log("uncaughtException message:", JSON.stringify(err));
  console.log("uncaughtException stack:", err.stack);
  console.error(err);
});
