export const convertSmallBufferToString = (buffer: ArrayBuffer) => {
  let array = new Uint8Array(buffer);
  let buf = Buffer.from(array);
  return buf.toString("base64");
};

export const convertSmallUint8ArrayToString = (array: Uint8Array) => {
  let buf = Buffer.from(array);
  return buf.toString("base64");
};

export const convertSmallStringToBuffer = (packed: string) => {
  return Buffer.from(packed, "base64");
};
