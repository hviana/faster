import { decoder, encoder } from "../lib/buffer_utils.ts";

export const encodeBase64 = (input: Uint8Array | string) => {
  let unencoded = input;
  if (typeof unencoded === "string") {
    unencoded = encoder.encode(unencoded);
  }
  const CHUNK_SIZE = 0x8000;
  const arr = [];
  for (let i = 0; i < unencoded.length; i += CHUNK_SIZE) {
    arr.push( //@ts-ignore
      String.fromCharCode.apply(null, unencoded.subarray(i, i + CHUNK_SIZE)),
    );
  }
  return btoa(arr.join(""));
};

export const encode = (input: Uint8Array | string) => {
  return encodeBase64(input).replace(/=/g, "").replace(/\+/g, "-").replace(
    /\//g,
    "_",
  );
};

export const decodeBase64 = (encoded: string): Uint8Array => {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

export const decode = (input: Uint8Array | string) => {
  let encoded = input;
  if (encoded instanceof Uint8Array) {
    encoded = decoder.decode(encoded);
  }
  encoded = encoded.replace(/-/g, "+").replace(/_/g, "/").replace(/\s/g, "");
  try {
    return decodeBase64(encoded);
  } catch {
    throw new TypeError("The input to be decoded is not correctly encoded.");
  }
};
