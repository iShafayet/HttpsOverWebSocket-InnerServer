import { HttpsOverWebSockerOuterServer } from "./index.js";
import { Config } from "./lib/config.js";
import { Logger } from "./lib/logger.js";
import {
  extractProcessParams,
  lookupAndLoadConfigAsync,
} from "./utility/startup-utils.js";

// We initiate logger and inject it into global so that it is usable everywhere.
global.logger = new Logger({
  switches: {
    debug: true,
    log: true,
    important: true,
    warning: true,
    error: true,
    critical: true,
  },
});
logger.init();

let commandLineParams = extractProcessParams();
logger.log("STARTUP Application parameters: ", commandLineParams);

let config: Config = lookupAndLoadConfigAsync(commandLineParams);
new HttpsOverWebSockerOuterServer().start(config);
