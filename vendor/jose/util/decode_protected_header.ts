/**
 * JOSE Protected Header Decoding (JWE, JWS, all serialization syntaxes)
 *
 * @module
 */

import { decode as b64u } from "./base64url.js";
import { decoder } from "../lib/buffer_utils.js";
import isObject from "../lib/is_object.js";
import type * as types from "../types.d.ts";

/** JWE and JWS Header Parameters */
export type ProtectedHeaderParameters =
  & types.JWSHeaderParameters
  & types.JWEHeaderParameters;

/**
 * Decodes the Protected Header of a JWE/JWS/JWT token utilizing any JOSE serialization.
 *
 * This function is exported (as a named export) from the main `'jose'` module entry point as well
 * as from its subpath export `'jose/decode/protected_header'`.
 *
 * @example
 *
 * ```js
 * const protectedHeader = jose.decodeProtectedHeader(token)
 * console.log(protectedHeader)
 * ```
 *
 * @param token JWE/JWS/JWT token in any JOSE serialization.
 */
export function decodeProtectedHeader(
  token: string | object,
): ProtectedHeaderParameters {
  let protectedB64u!: unknown;

  if (typeof token === "string") {
    const parts = token.split(".");
    if (parts.length === 3 || parts.length === 5) {
      [protectedB64u] = parts;
    }
  } else if (typeof token === "object" && token) {
    if ("protected" in token) {
      protectedB64u = token.protected;
    } else {
      throw new TypeError("Token does not contain a Protected Header");
    }
  }

  try {
    if (typeof protectedB64u !== "string" || !protectedB64u) {
      throw new Error();
    }
    const result = JSON.parse(decoder.decode(b64u(protectedB64u!)));
    if (!isObject(result)) {
      throw new Error();
    }
    return result as ProtectedHeaderParameters;
  } catch {
    throw new TypeError("Invalid Token or Protected Header formatting");
  }
}
