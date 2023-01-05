import { Config } from "./lib/config.js";
import {
  extractProcessParams,
  lookupAndLoadConfigAsync,
} from "./utility/startup-utils.js";
import { HttpsOverWebSockerOuterServer } from "./index.js";

let commandLineParams = extractProcessParams();
console.log("STARTUP Application parameters: ", commandLineParams);

let config: Config = lookupAndLoadConfigAsync(commandLineParams);
new HttpsOverWebSockerOuterServer().start(config);
