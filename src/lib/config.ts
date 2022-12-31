export type Config = {
  pssk: string;
  symmetricEncryption: {
    enabled: boolean,
    algorithm: string,
    secret: string
  };
  outerServer: {
    url: string
  },
  localServer: {
    url: string
  },
  outgoingConnection: {
    maxCount: number,
    minCount: number
  }
};
