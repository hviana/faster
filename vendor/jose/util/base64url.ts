/**
 * Base64URL encoding and decoding utilities
 *
 * @module
 */

import { decoder, encoder } from "../lib/buffer_utils.js";
import { decodeBase64, encodeBase64 } from "../lib/base64.js";

/** Decodes a Base64URL encoded input. */
export function decode(input: Uint8Array | string): Uint8Array {
  // @ts-ignore
  if (Uint8Array.fromBase64) {
    // @ts-ignore
    return Uint8Array.fromBase64(
      typeof input === "string" ? input : decoder.decode(input),
      {
        alphabet: "base64url",
      },
    );
  }

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
}

/** Encodes an input using Base64URL with no padding. */
export function encode(input: Uint8Array | string): string {
  let unencoded = input;
  if (typeof unencoded === "string") {
    unencoded = encoder.encode(unencoded);
  }

  // @ts-ignore
  if (Uint8Array.prototype.toBase64) {
    // @ts-ignore
    return unencoded.toBase64({ alphabet: "base64url", omitPadding: true });
  }

  return encodeBase64(unencoded).replace(/=/g, "").replace(/\+/g, "-").replace(
    /\//g,
    "_",
  );
}
