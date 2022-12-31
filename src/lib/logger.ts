const STYLE = {
  FgYellow: "\x1b[33m"
};

class Logger {
  private switches = {
    debug: true,
    log: true,
    important: true,
    warning: true,
    error: true,
    urgent: true,
  };

  constructor({
    switches: {
      debug = false,
      log = true,
      warning = true,
      error = true,
      important = true,
      urgent = true,
    },
  }: any = {}) {
    this.switches = {
      debug,
      log,
      important,
      warning,
      error,
      urgent,
    };
  }

  init() {
    this.log("Logger initated");
  }

  debug(...args: any) {
    if (!this.switches.debug) return;
    console.log.apply(console, [STYLE.FgYellow, "DEBUG\t", ...args]);
  }

  log(...args: any) {
    if (!this.switches.log) return;
    console.log.apply(console, ["LOG\t", ...args]);
  }

  urgent(...args: any) {
    if (!this.switches.important) return;
    args.forEach((arg: any, index: number) => {
      args[index] = JSON.stringify(arg, null, 2);
    });
    console.log.apply(console, ["URGENT\t", ...args]);
  }

  important(...args: any) {
    if (!this.switches.important) return;
    console.log.apply(console, ["IMPORTANT\t", ...args]);
  }

  warn(errorObject: Error, optionalContext = null) {
    console.warn(errorObject);

    let errorString = JSON.stringify(
      errorObject,
      Object.getOwnPropertyNames(errorObject)
    );
    console.log.apply(console, ["IMPORTANT\t", errorString, optionalContext]);
  }

  error(errorObject: Error, optionalContext = null) {
    console.error(errorObject);

    // let errorString = JSON.stringify(
    //   errorObject,
    //   Object.getOwnPropertyNames(errorObject)
    // );
    // console.log.apply(console, ["IMPORTANT\t", errorString, optionalContext]);
  }
}

export { Logger };
