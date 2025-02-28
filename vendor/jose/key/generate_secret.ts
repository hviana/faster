/**
 * Symmetric key generation
 *
 * @module
 */

import { JOSENotSupported } from "../util/errors.js";

import type * as types from "../types.d.ts";

/** Secret generation function options. */
export interface GenerateSecretOptions {
  /**
   * The value to use as {@link !SubtleCrypto.generateKey} `extractable` argument. Default is false.
   *
   * Note: Because A128CBC-HS256, A192CBC-HS384, and A256CBC-HS512 secrets cannot be represented as
   * {@link !CryptoKey} this option has no effect for them.
   */
  extractable?: boolean;
}

/**
 * Generates a symmetric secret key for a given JWA algorithm identifier.
 *
 * Note: The secret key is generated with `extractable` set to `false` by default.
 *
 * Note: Because A128CBC-HS256, A192CBC-HS384, and A256CBC-HS512 secrets cannot be represented as
 * {@link !CryptoKey} this method yields a {@link !Uint8Array} for them instead.
 *
 * This function is exported (as a named export) from the main `'jose'` module entry point as well
 * as from its subpath export `'jose/generate/secret'`.
 *
 * @example
 *
 * ```js
 * const secret = await jose.generateSecret('HS256')
 * console.log(secret)
 * ```
 *
 * @param alg JWA Algorithm Identifier to be used with the generated secret. See
 *   {@link https://github.com/panva/jose/issues/210 Algorithm Key Requirements}.
 * @param options Additional options passed down to the secret generation.
 */
export async function generateSecret(
  alg: string,
  options?: GenerateSecretOptions,
): Promise<types.CryptoKey | Uint8Array> {
  let length: number;
  let algorithm: AesKeyGenParams | HmacKeyGenParams;
  let keyUsages: KeyUsage[];
  switch (alg) {
    case "HS256":
    case "HS384":
    case "HS512":
      length = parseInt(alg.slice(-3), 10);
      algorithm = { name: "HMAC", hash: `SHA-${length}`, length };
      keyUsages = ["sign", "verify"];
      break;
    case "A128CBC-HS256":
    case "A192CBC-HS384":
    case "A256CBC-HS512":
      length = parseInt(alg.slice(-3), 10);
      return crypto.getRandomValues(new Uint8Array(length >> 3));
    case "A128KW":
    case "A192KW":
    case "A256KW":
      length = parseInt(alg.slice(1, 4), 10);
      algorithm = { name: "AES-KW", length };
      keyUsages = ["wrapKey", "unwrapKey"];
      break;
    case "A128GCMKW":
    case "A192GCMKW":
    case "A256GCMKW":
    case "A128GCM":
    case "A192GCM":
    case "A256GCM":
      length = parseInt(alg.slice(1, 4), 10);
      algorithm = { name: "AES-GCM", length };
      keyUsages = ["encrypt", "decrypt"];
      break;
    default:
      throw new JOSENotSupported(
        'Invalid or unsupported JWK "alg" (Algorithm) Parameter value',
      );
  }

  return crypto.subtle.generateKey(
    algorithm,
    options?.extractable ?? false,
    keyUsages,
  );
}
