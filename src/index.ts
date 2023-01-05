import { Config } from "./lib/config.js";
import { Logger } from "./lib/logger.js";
import { startHisServer } from "./server.js";

// We initiate logger and inject it into global so that it is usable everywhere.
global.logger = new Logger({
  switches: {
    debug: true,
    log: true,
    important: true,
    warning: true,
    error: true,
    urgent: true,
  },
});
await logger.init();

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
