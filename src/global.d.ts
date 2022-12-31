/* eslint-disable no-var */
import { Logger } from "./lib/logger";

declare global {
  var logger: Logger;
  var dispatch: {
  };
}

