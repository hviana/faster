/**
 * Encrypting JSON Web Encryption (JWE) in Compact Serialization
 *
 * @module
 */

import type * as types from "../../types.d.ts";
import { FlattenedEncrypt } from "../flattened/encrypt.js";

/**
 * The CompactEncrypt class is used to build and encrypt Compact JWE strings.
 *
 * This class is exported (as a named export) from the main `'jose'` module entry point as well as
 * from its subpath export `'jose/jwe/compact/encrypt'`.
 *
 * @example
 *
 * ```js
 * const jwe = await new jose.CompactEncrypt(
 *   new TextEncoder().encode('It’s a dangerous business, Frodo, going out your door.'),
 * )
 *   .setProtectedHeader({ alg: 'RSA-OAEP-256', enc: 'A256GCM' })
 *   .encrypt(publicKey)
 *
 * console.log(jwe)
 * ```
 */
export class CompactEncrypt {
  private _flattened: FlattenedEncrypt;

  /** @param plaintext Binary representation of the plaintext to encrypt. */
  constructor(plaintext: Uint8Array) {
    this._flattened = new FlattenedEncrypt(plaintext);
  }

  /**
   * Sets a content encryption key to use, by default a random suitable one is generated for the JWE
   * enc" (Encryption Algorithm) Header Parameter.
   *
   * @deprecated You should not use this method. It is only really intended for test and vector
   *   validation purposes.
   *
   * @param cek JWE Content Encryption Key.
   */
  setContentEncryptionKey(cek: Uint8Array): this {
    this._flattened.setContentEncryptionKey(cek);
    return this;
  }

  /**
   * Sets the JWE Initialization Vector to use for content encryption, by default a random suitable
   * one is generated for the JWE enc" (Encryption Algorithm) Header Parameter.
   *
   * @deprecated You should not use this method. It is only really intended for test and vector
   *   validation purposes.
   *
   * @param iv JWE Initialization Vector.
   */
  setInitializationVector(iv: Uint8Array): this {
    this._flattened.setInitializationVector(iv);
    return this;
  }

  /**
   * Sets the JWE Protected Header on the CompactEncrypt object.
   *
   * @param protectedHeader JWE Protected Header object.
   */
  setProtectedHeader(protectedHeader: types.CompactJWEHeaderParameters): this {
    this._flattened.setProtectedHeader(protectedHeader);
    return this;
  }

  /**
   * Sets the JWE Key Management parameters to be used when encrypting the Content Encryption Key.
   * You do not need to invoke this method, it is only really intended for test and vector
   * validation purposes.
   *
   * @param parameters JWE Key Management parameters.
   */
  setKeyManagementParameters(
    parameters: types.JWEKeyManagementHeaderParameters,
  ): this {
    this._flattened.setKeyManagementParameters(parameters);
    return this;
  }

  /**
   * Encrypts and resolves the value of the Compact JWE string.
   *
   * @param key Public Key or Secret to encrypt the JWE with. See
   *   {@link https://github.com/panva/jose/issues/210#jwe-alg Algorithm Key Requirements}.
   * @param options JWE Encryption options.
   */
  async encrypt(
    key: types.CryptoKey | types.KeyObject | types.JWK | Uint8Array,
    options?: types.EncryptOptions,
  ): Promise<string> {
    const jwe = await this._flattened.encrypt(key, options);

    return [jwe.protected, jwe.encrypted_key, jwe.iv, jwe.ciphertext, jwe.tag]
      .join(".");
  }
}
