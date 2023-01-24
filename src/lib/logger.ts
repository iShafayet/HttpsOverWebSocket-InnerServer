const STYLE = {
  FgYellow: "\x1b[33m",
  FgRed: "\x1b[31m",
  FgGray: "\x1b[90m",
  Reset: "\x1b[0m",
  BgBlue: "\x1b[44m",
  BgMagenta: "\x1b[45m",
  BgRed: "\x1b[41m",
};

class Logger {
  private switches = {
    debug: true,
    log: true,
    important: true,
    warning: true,
    error: true,
    critical: true,
  };

  constructor({
    switches: {
      debug = false,
      log = true,
      warning = true,
      error = true,
      important = true,
      critical = true,
    },
  }: any = {}) {
    this.switches = {
      debug,
      log,
      important,
      warning,
      error,
      critical,
    };
  }

  init() {
    this.log("Logger initated");
  }

  debug(...args: any) {
    if (!this.switches.debug) return;
    console.log.apply(console, [this.makePrefix("DEBUG"), ...args]);
  }

  log(...args: any) {
    if (!this.switches.log) return;
    console.log.apply(console, [this.makePrefix("LOG"), ...args]);
  }

  critical(...args: any) {
    if (!this.switches.critical) return;
    args.forEach((arg: any, index: number) => {
      args[index] = JSON.stringify(arg, null, 2);
    });
    console.log.apply(console, [this.makePrefix("CRITICAL"), ...args]);
  }

  important(...args: any) {
    if (!this.switches.important) return;
    console.log.apply(console, [this.makePrefix("IMPORTANT"), ...args]);
  }

  warn(errorObject: Error, optionalContext: any = null) {
    try {
      let errorString = this.stringifyError(errorObject);

      let args = [this.makePrefix("WARN"), errorString];
      if (optionalContext) {
        args.push("| Context:");
        args.push(optionalContext);
      }
      console.log.apply(console, args);
    } catch (ex) {
      let args = [this.makePrefix("WARN"), errorObject];
      if (optionalContext) {
        args.push("| Context:");
        args.push(optionalContext);
      }
      console.log.apply(console, args);
    }

    console.warn(errorObject);
  }

  error(errorObject: Error, optionalContext: any = null) {
    try {
      let errorString = this.stringifyError(errorObject);

      let args = [this.makePrefix("ERROR"), errorString];
      if (optionalContext) {
        args.push("| Context:");
        args.push(optionalContext);
      }
      console.log.apply(console, args);
    } catch (ex) {
      let args = [this.makePrefix("ERROR"), errorObject];
      if (optionalContext) {
        args.push("| Context:");
        args.push(optionalContext);
      }
      console.log.apply(console, args);
    }

    console.error(errorObject);
  }

  private makePrefix(logType: string) {
    let color = "";
    if (logType === "DEBUG") {
      color = STYLE.FgYellow;
    } else if (logType === "LOG") {
      color = STYLE.FgGray;
    } else if (logType === "WARN") {
      color = STYLE.FgRed;
    } else if (logType === "IMPORTANT") {
      color = STYLE.BgBlue;
    } else if (logType === "CRITICAL") {
      color = STYLE.BgMagenta;
    } else if (logType === "ERROR") {
      color = STYLE.BgRed;
    }
    let datetime = new Date().toISOString();
    return `${color}[${process.pid}, ${logType}, ${datetime}]${STYLE.Reset}`;
  }

  private stringifyError(errorObject: Error) {
    let errorString = "";
    if ((errorObject as any).name) {
      errorString += (errorObject as any).name + ", ";
    }

    if ((errorObject as any).code) {
      errorString += (errorObject as any).code + ", ";
    }

    if (errorObject.message) {
      errorString += errorObject.message;
    }

    return errorString;
  }
}

export { Logger };
