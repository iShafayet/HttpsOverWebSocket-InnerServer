import {
  convertSmallBufferToString,
  convertSmallStringToBuffer,
  convertSmallUint8ArrayToString,
} from "./buffer-utils.js";

const IV_LENGTH = 12;
const SALT_LENGTH = 16;

const PASSPHRASE_ENCODING = "utf-8";

const PASSPHRASE_IMPORTKEY_ALGORITHM = "PBKDF2";
const PASSPHRASE_DERIVEKEY_ALGORITHM = "PBKDF2";
const PASSPHRASE_DERIVEKEY_ITERATIONS = 100000;
const PASSPHRASE_DERIVEKEY_HASH_ALGORITHM = "SHA-256";
const PASSPHRASE_DERIVEKEY_GENERATED_KEYLENGTH = 256;

const ENCRYPTION_ALGORITHM = "AES-GCM";
const ENCRYPTION_TAGLENGTH_IN_BITS = 128;

export const makeRandomIv = async () => {
  let iv = globalThis.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  return { iv };
};

export const makeRandomSalt = async () => {
  let salt = globalThis.crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  return { salt };
};

export const createEncryptionKeyFromPassword = async (
  encryptionPassword: string,
  salt: Uint8Array
) => {
  if (!encryptionPassword) {
    throw new Error("encryptionPassword is required");
  }

  if (!salt) {
    throw new Error("salt is required");
  }

  let encodedPassphrase = new TextEncoder().encode(encryptionPassword);

  let keyMaterial = await globalThis.crypto.subtle.importKey(
    "raw",
    encodedPassphrase,
    PASSPHRASE_IMPORTKEY_ALGORITHM,
    false,
    ["deriveBits", "deriveKey"]
  );

  let key = await globalThis.crypto.subtle.deriveKey(
    {
      name: PASSPHRASE_DERIVEKEY_ALGORITHM,
      salt,
      iterations: PASSPHRASE_DERIVEKEY_ITERATIONS,
      hash: PASSPHRASE_DERIVEKEY_HASH_ALGORITHM,
    },
    keyMaterial,
    {
      name: ENCRYPTION_ALGORITHM,
      length: PASSPHRASE_DERIVEKEY_GENERATED_KEYLENGTH,
    },
    true,
    ["encrypt", "decrypt"]
  );

  return { key, salt };
};

// For encrypting small (<10mb) amount of data
export const encryptText = async (text: string, encryptionPassword: string) => {
  // encode
  const encoder = new TextEncoder();
  let encodedData = encoder.encode(text);

  // get salt and key
  let { salt } = await makeRandomSalt();
  let { key } = await createEncryptionKeyFromPassword(encryptionPassword, salt);

  // generate random iv
  let { iv } = await makeRandomIv();

  const cipher = await globalThis.crypto.subtle.encrypt(
    {
      name: ENCRYPTION_ALGORITHM,
      iv: iv,
      tagLength: ENCRYPTION_TAGLENGTH_IN_BITS,
    },
    key,
    encodedData
  );

  // pack
  return {
    cipher: convertSmallBufferToString(cipher),
    iv: convertSmallUint8ArrayToString(iv),
    salt: convertSmallUint8ArrayToString(salt),
  };
};

// For decrypting small (<10mb) amount of data
export const decryptText = async (
  { cipher, iv, salt }: { cipher: any; iv: any; salt: any },
  encryptionPassword: string
) => {
  // unpack
  cipher = convertSmallStringToBuffer(cipher);
  iv = convertSmallStringToBuffer(iv);
  salt = convertSmallStringToBuffer(salt);

  // get  key
  let { key } = await createEncryptionKeyFromPassword(encryptionPassword, salt);

  const encodedData = await globalThis.crypto.subtle.decrypt(
    {
      name: ENCRYPTION_ALGORITHM,
      iv: iv,
      tagLength: ENCRYPTION_TAGLENGTH_IN_BITS,
    },
    key,
    cipher
  );

  // decode
  let data = new TextDecoder().decode(encodedData);

  return data;
};

// For encrypting small (<10mb) amount of data
export const encryptObject = async (
  object: Record<string, any>,
  encryptionPassword: string
): Promise<string> => {
  let text = JSON.stringify(object);
  let encryped = await encryptText(text, encryptionPassword);
  return JSON.stringify(encryped);
};

// For decrypting small (<10mb) amount of data
export const decryptToObject = async (
  encryptedText: string,
  encryptionPassword: string
) => {
  let encrypted = JSON.parse(encryptedText);
  let decrypted = await decryptText(encrypted, encryptionPassword);
  return JSON.parse(decrypted);
};

// for encrypting chunks of data
export const encryptBuffer = async (
  { iv, key }: { iv: any; key: any },
  buffer: ArrayBuffer
): Promise<ArrayBuffer> => {
  const encryptedBuffer = await globalThis.crypto.subtle.encrypt(
    {
      name: ENCRYPTION_ALGORITHM,
      iv: iv,
      tagLength: ENCRYPTION_TAGLENGTH_IN_BITS,
    },
    key,
    buffer
  );
  return encryptedBuffer;
};

// for decrypting chunks of data
export const decryptBuffer = async (
  { iv, key }: { iv: any; key: any },
  buffer: ArrayBuffer
): Promise<ArrayBuffer> => {
  try {
    const decryptedBuffer = await globalThis.crypto.subtle.decrypt(
      {
        name: ENCRYPTION_ALGORITHM,
        iv: iv,
        tagLength: ENCRYPTION_TAGLENGTH_IN_BITS,
      },
      key,
      buffer
    );
    return decryptedBuffer;
  } catch (_ex) {
    let ex = _ex as Error;
    console.warn(
      "Caught and rethrown decryption error (details):",
      ex instanceof DOMException,
      (ex as any).code,
      ex.message,
      ex.name,
      ex.stack
    );
    console.error("Caught and rethrown decryption error:", ex);
    console.error(ex);
    throw ex;
  }
};
