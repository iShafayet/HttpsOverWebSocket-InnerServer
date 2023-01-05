import { Writable } from "stream";

export const sleep = (durationMillis: number) => {
  return new Promise((accept) => setTimeout(accept, durationMillis));
};

export const writeToStream = (
  stream: Writable,
  data: Buffer | string
): Promise<void> => {
  return new Promise((accept, reject) => {
    stream.write(data, (err) => {
      if (err) return reject(err);
      return accept();
    });
  });
};
