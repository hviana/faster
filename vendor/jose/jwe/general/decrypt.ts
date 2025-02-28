/**
 * Decrypting JSON Web Encryption (JWE) in General JSON Serialization
 *
 * @module
 */

import { flattenedDecrypt } from "../flattened/decrypt.js";
import { JWEDecryptionFailed, JWEInvalid } from "../../util/errors.js";
import type * as types from "../../types.d.ts";
import isObject from "../../lib/is_object.js";

/**
 * Interface for General JWE Decryption dynamic key resolution. No token components have been
 * verified at the time of this function call.
 */
export interface GeneralDecryptGetKey
  extends types.GetKeyFunction<types.JWEHeaderParameters, types.FlattenedJWE> {}

/**
 * Decrypts a General JWE.
 *
 * This function is exported (as a named export) from the main `'jose'` module entry point as well
 * as from its subpath export `'jose/jwe/general/decrypt'`.
 *
 * @example
 *
 * ```js
 * const jwe = {
 *   ciphertext: '9EzjFISUyoG-ifC2mSihfP0DPC80yeyrxhTzKt1C_VJBkxeBG0MI4Te61Pk45RAGubUvBpU9jm4',
 *   iv: '8Fy7A_IuoX5VXG9s',
 *   tag: 'W76IYV6arGRuDSaSyWrQNg',
 *   aad: 'VGhlIEZlbGxvd3NoaXAgb2YgdGhlIFJpbmc',
 *   protected: 'eyJhbGciOiJSU0EtT0FFUC0yNTYiLCJlbmMiOiJBMjU2R0NNIn0',
 *   recipients: [
 *     {
 *       encrypted_key:
 *         'Z6eD4UK_yFb5ZoKvKkGAdqywEG_m0e4IYo0x8Vf30LAMJcsc-_zSgIeiF82teZyYi2YYduHKoqImk7MRnoPZOlEs0Q5BNK1OgBmSOhCE8DFyqh9Zh48TCTP6lmBQ52naqoUJFMtHzu-0LwZH26hxos0GP3Dt19O379MJB837TdKKa87skq0zHaVLAquRHOBF77GI54Bc7O49d8aOrSu1VEFGMThlW2caspPRiTSePDMDPq7_WGk50izRhB3Asl9wmP9wEeaTrkJKRnQj5ips1SAZ1hDBsqEQKKukxP1HtdcopHV5_qgwU8Hjm5EwSLMluMQuiE6hwlkXGOujZLVizA',
 *     },
 *   ],
 * }
 *
 * const { plaintext, protectedHeader, additionalAuthenticatedData } =
 *   await jose.generalDecrypt(jwe, privateKey)
 *
 * console.log(protectedHeader)
 * const decoder = new TextDecoder()
 * console.log(decoder.decode(plaintext))
 * console.log(decoder.decode(additionalAuthenticatedData))
 * ```
 *
 * @param jwe General JWE.
 * @param key Private Key or Secret to decrypt the JWE with. See
 *   {@link https://github.com/panva/jose/issues/210#jwe-alg Algorithm Key Requirements}.
 * @param options JWE Decryption options.
 */
export function generalDecrypt(
  jwe: types.GeneralJWE,
  key: types.CryptoKey | types.KeyObject | types.JWK | Uint8Array,
  options?: types.DecryptOptions,
): Promise<types.GeneralDecryptResult>;
/**
 * @param jwe General JWE.
 * @param getKey Function resolving Private Key or Secret to decrypt the JWE with. See
 *   {@link https://github.com/panva/jose/issues/210#jwe-alg Algorithm Key Requirements}.
 * @param options JWE Decryption options.
 */
export function generalDecrypt(
  jwe: types.GeneralJWE,
  getKey: GeneralDecryptGetKey,
  options?: types.DecryptOptions,
): Promise<types.GeneralDecryptResult & types.ResolvedKey>;
export async function generalDecrypt(
  jwe: types.GeneralJWE,
  key:
    | types.CryptoKey
    | types.KeyObject
    | types.JWK
    | Uint8Array
    | GeneralDecryptGetKey,
  options?: types.DecryptOptions,
) {
  if (!isObject(jwe)) {
    throw new JWEInvalid("General JWE must be an object");
  }

  if (!Array.isArray(jwe.recipients) || !jwe.recipients.every(isObject)) {
    throw new JWEInvalid("JWE Recipients missing or incorrect type");
  }

  if (!jwe.recipients.length) {
    throw new JWEInvalid("JWE Recipients has no members");
  }

  for (const recipient of jwe.recipients) {
    try {
      return await flattenedDecrypt(
        {
          aad: jwe.aad,
          ciphertext: jwe.ciphertext,
          encrypted_key: recipient.encrypted_key,
          header: recipient.header,
          iv: jwe.iv,
          protected: jwe.protected,
          tag: jwe.tag,
          unprotected: jwe.unprotected,
        },
        key as Parameters<typeof flattenedDecrypt>[1],
        options,
      );
    } catch {
      //
    }
  }
  throw new JWEDecryptionFailed();
}
