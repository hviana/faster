import { generateSecret as generate } from "../runtime/generate.ts";

import type { KeyLike } from "../types.d.ts";

export interface GenerateSecretOptions {
  /**
   * (Only effective in Web Crypto API runtimes) The value to use as
   * {@link !SubtleCrypto.generateKey} `extractable` argument. Default is false.
   */
  extractable?: boolean;
}

/**
 * Generates a symmetric secret key for a given JWA algorithm identifier.
 *
 * Note: Under Web Crypto API runtime the secret key is generated with `extractable` set to `false`
 * by default.
 *
 * This function is exported (as a named export) from the main `'jose'` module entry point as well
 * as from its subpath export `'jose/generate/secret'`.
 *
 * @param alg JWA Algorithm Identifier to be used with the generated secret.
 * @param options Additional options passed down to the secret generation.
 */
export async function generateSecret<KeyLikeType extends KeyLike = KeyLike>(
  alg: string,
  options?: GenerateSecretOptions,
): Promise<KeyLikeType | Uint8Array> {
  // @ts-ignore
  return generate(alg, options);
}
