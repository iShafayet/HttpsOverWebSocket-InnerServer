import { readFileSync } from "fs";
import { Config } from "../lib/config.js";

export const extractProcessParams = () => {
  if (process.argv.length < 2) {
    throw new Error("Invalid number of arguments");
  }

  let index = process.argv.findIndex((arg) => {
    return arg.indexOf("start.js") > -1 || arg.indexOf("start-dev.js") > -1;
  });

  if (index === -1) {
    throw new Error("Expected start.js or start-dev.js in process arguments.");
  }

  return process.argv.slice(index + 1);
};

export const loadConfig = (path: String): Config => {
  console.log(`STARTUP trying to load configuration from: ${path}`);
  let content = readFileSync(<any>path, { encoding: "utf8" });
  console.log(`STARTUP loading config: ${content}`);
  return JSON.parse(content);
};

import { homedir } from "os";
import path from "path";
import os from "os";
import constants from "../constant/common-constants.js";

const ARG_CONFIG_LOCATION = "--config";
const ENVIRONMENT_CONFIG_LOCATION_KEY = "NK_CONFIG_LOCATION";
const WINDOWS_PLATFORM_IDENTIFIER = "win32";
const WINDOWS_PROGRAMDATA_FALLBACK = "C:\\ProgramData";

export const lookupAndLoadConfigAsync = (commandLineParams: string[]) => {
  // First priority is the command line parameter;
  if (commandLineParams.indexOf(ARG_CONFIG_LOCATION) > -1) {
    let index = commandLineParams.indexOf(ARG_CONFIG_LOCATION) + 1;
    let configLocation = commandLineParams[index];

    console.log(
      "STARTUP Config location (from command line): ",
      configLocation
    );
    return loadConfig(configLocation);
  }

  // Next priority is the environment variable;
  if (process.env[ENVIRONMENT_CONFIG_LOCATION_KEY]) {
    let configLocation = process.env[ENVIRONMENT_CONFIG_LOCATION_KEY];
    console.log(
      "STARTUP Config location (from environment variable): ",
      configLocation
    );
    return loadConfig(configLocation);
  }

  // Next is homedir
  try {
    let configLocation = path.join(
      homedir(),
      constants.config.CONFIG_DIRECTORY_NAME,
      constants.config.CONFIG_FILE_NAME
    );
    return loadConfig(configLocation);
  } catch (ex) {
    // Finally try /etc/nkrypt-xyz/config.json on linux and mac or ProgramData on windows
    let etcDir =
      os.platform() === WINDOWS_PLATFORM_IDENTIFIER
        ? process.env.ALLUSERSPROFILE || WINDOWS_PROGRAMDATA_FALLBACK
        : "/etc/";

    let configLocation = path.join(
      etcDir,
      constants.config.CONFIG_DIRECTORY_NAME,
      constants.config.CONFIG_FILE_NAME
    );
    return loadConfig(configLocation);
  }
};
