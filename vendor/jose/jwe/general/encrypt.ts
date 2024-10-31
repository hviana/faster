import { FlattenedEncrypt } from "../flattened/encrypt.ts";
import { unprotected } from "../../lib/private_symbols.ts";
import { JOSENotSupported, JWEInvalid } from "../../util/errors.ts";
import generateCek from "../../lib/cek.ts";
import isDisjoint from "../../lib/is_disjoint.ts";
import encryptKeyManagement from "../../lib/encrypt_key_management.ts";
import { encode as base64url } from "../../runtime/base64url.ts";
import validateCrit from "../../lib/validate_crit.ts";

import type {
  CritOption,
  GeneralJWE,
  JWEHeaderParameters,
  KeyLike,
} from "../../types.d.ts";

export interface Recipient {
  /**
   * Sets the JWE Per-Recipient Unprotected Header on the Recipient object.
   *
   * @param unprotectedHeader JWE Per-Recipient Unprotected Header.
   */
  setUnprotectedHeader(unprotectedHeader: JWEHeaderParameters): Recipient;

  /** A shorthand for calling addRecipient() on the enclosing GeneralEncrypt instance */
  addRecipient(...args: Parameters<GeneralEncrypt["addRecipient"]>): Recipient;

  /** A shorthand for calling encrypt() on the enclosing GeneralEncrypt instance */
  encrypt(...args: Parameters<GeneralEncrypt["encrypt"]>): Promise<GeneralJWE>;

  /** Returns the enclosing GeneralEncrypt */
  done(): GeneralEncrypt;
}

class IndividualRecipient implements Recipient {
  private parent: GeneralEncrypt;
  unprotectedHeader?: JWEHeaderParameters;
  key: KeyLike | Uint8Array;
  options: CritOption;

  constructor(
    enc: GeneralEncrypt,
    key: KeyLike | Uint8Array,
    options: CritOption,
  ) {
    this.parent = enc;
    this.key = key;
    this.options = options;
  }

  setUnprotectedHeader(unprotectedHeader: JWEHeaderParameters) {
    if (this.unprotectedHeader) {
      throw new TypeError("setUnprotectedHeader can only be called once");
    }
    this.unprotectedHeader = unprotectedHeader;
    return this;
  }

  addRecipient(...args: Parameters<GeneralEncrypt["addRecipient"]>) {
    return this.parent.addRecipient(...args);
  }

  encrypt(...args: Parameters<GeneralEncrypt["encrypt"]>) {
    return this.parent.encrypt(...args);
  }

  done() {
    return this.parent;
  }
}

/**
 * The GeneralEncrypt class is used to build and encrypt General JWE objects.
 *
 * This class is exported (as a named export) from the main `'jose'` module entry point as well as
 * from its subpath export `'jose/jwe/general/encrypt'`.
 */
export class GeneralEncrypt {
  private _plaintext: Uint8Array;

  private _recipients: IndividualRecipient[] = [];

  private _protectedHeader!: JWEHeaderParameters;

  private _unprotectedHeader!: JWEHeaderParameters;

  private _aad!: Uint8Array;

  /** @param plaintext Binary representation of the plaintext to encrypt. */
  constructor(plaintext: Uint8Array) {
    this._plaintext = plaintext;
  }

  /**
   * Adds an additional recipient for the General JWE object.
   *
   * @param key Public Key or Secret to encrypt the Content Encryption Key for the recipient with.
   *   See {@link https://github.com/panva/jose/issues/210#jwe-alg Algorithm Key Requirements}.
   * @param options JWE Encryption options.
   */
  addRecipient(key: KeyLike | Uint8Array, options?: CritOption): Recipient {
    const recipient = new IndividualRecipient(this, key, {
      crit: options?.crit,
    });
    this._recipients.push(recipient);
    return recipient;
  }

  /**
   * Sets the JWE Protected Header on the GeneralEncrypt object.
   *
   * @param protectedHeader JWE Protected Header object.
   */
  setProtectedHeader(protectedHeader: JWEHeaderParameters): this {
    if (this._protectedHeader) {
      throw new TypeError("setProtectedHeader can only be called once");
    }
    this._protectedHeader = protectedHeader;
    return this;
  }

  /**
   * Sets the JWE Shared Unprotected Header on the GeneralEncrypt object.
   *
   * @param sharedUnprotectedHeader JWE Shared Unprotected Header object.
   */
  setSharedUnprotectedHeader(
    sharedUnprotectedHeader: JWEHeaderParameters,
  ): this {
    if (this._unprotectedHeader) {
      throw new TypeError("setSharedUnprotectedHeader can only be called once");
    }
    this._unprotectedHeader = sharedUnprotectedHeader;
    return this;
  }

  /**
   * Sets the Additional Authenticated Data on the GeneralEncrypt object.
   *
   * @param aad Additional Authenticated Data.
   */
  setAdditionalAuthenticatedData(aad: Uint8Array): this {
    this._aad = aad;
    return this;
  }

  /** Encrypts and resolves the value of the General JWE object. */
  async encrypt(): Promise<GeneralJWE> {
    if (!this._recipients.length) {
      throw new JWEInvalid("at least one recipient must be added");
    }

    if (this._recipients.length === 1) {
      const [recipient] = this._recipients;

      const flattened = await new FlattenedEncrypt(this._plaintext)
        .setAdditionalAuthenticatedData(this._aad)
        .setProtectedHeader(this._protectedHeader)
        .setSharedUnprotectedHeader(this._unprotectedHeader)
        .setUnprotectedHeader(recipient.unprotectedHeader!)
        .encrypt(recipient.key, { ...recipient.options });

      const jwe: GeneralJWE = {
        ciphertext: flattened.ciphertext,
        iv: flattened.iv,
        recipients: [{}],
        tag: flattened.tag,
      };

      if (flattened.aad) jwe.aad = flattened.aad;
      if (flattened.protected) jwe.protected = flattened.protected;
      if (flattened.unprotected) jwe.unprotected = flattened.unprotected;
      if (flattened.encrypted_key) {
        jwe.recipients![0].encrypted_key = flattened.encrypted_key;
      }
      if (flattened.header) jwe.recipients![0].header = flattened.header;

      return jwe;
    }

    let enc!: string;
    for (let i = 0; i < this._recipients.length; i++) {
      const recipient = this._recipients[i];
      if (
        !isDisjoint(
          this._protectedHeader,
          this._unprotectedHeader,
          recipient.unprotectedHeader,
        )
      ) {
        throw new JWEInvalid(
          "JWE Protected, JWE Shared Unprotected and JWE Per-Recipient Header Parameter names must be disjoint",
        );
      }

      const joseHeader = {
        ...this._protectedHeader,
        ...this._unprotectedHeader,
        ...recipient.unprotectedHeader,
      };

      const { alg } = joseHeader;

      if (typeof alg !== "string" || !alg) {
        throw new JWEInvalid(
          'JWE "alg" (Algorithm) Header Parameter missing or invalid',
        );
      }

      if (alg === "dir" || alg === "ECDH-ES") {
        throw new JWEInvalid(
          '"dir" and "ECDH-ES" alg may only be used with a single recipient',
        );
      }

      if (typeof joseHeader.enc !== "string" || !joseHeader.enc) {
        throw new JWEInvalid(
          'JWE "enc" (Encryption Algorithm) Header Parameter missing or invalid',
        );
      }

      if (!enc) {
        enc = joseHeader.enc;
      } else if (enc !== joseHeader.enc) {
        throw new JWEInvalid(
          'JWE "enc" (Encryption Algorithm) Header Parameter must be the same for all recipients',
        );
      }

      validateCrit(
        JWEInvalid,
        new Map(),
        recipient.options.crit,
        this._protectedHeader,
        joseHeader,
      );

      if (joseHeader.zip !== undefined) {
        throw new JOSENotSupported(
          'JWE "zip" (Compression Algorithm) Header Parameter is not supported.',
        );
      }
    }

    const cek = generateCek(enc);

    const jwe: GeneralJWE = {
      ciphertext: "",
      iv: "",
      recipients: [],
      tag: "",
    };

    for (let i = 0; i < this._recipients.length; i++) {
      const recipient = this._recipients[i];
      const target: Record<string, string | JWEHeaderParameters> = {};
      jwe.recipients!.push(target);

      const joseHeader = {
        ...this._protectedHeader,
        ...this._unprotectedHeader,
        ...recipient.unprotectedHeader,
      };

      const p2c = joseHeader.alg!.startsWith("PBES2") ? 2048 + i : undefined;

      if (i === 0) {
        const flattened = await new FlattenedEncrypt(this._plaintext)
          .setAdditionalAuthenticatedData(this._aad)
          .setContentEncryptionKey(cek)
          .setProtectedHeader(this._protectedHeader)
          .setSharedUnprotectedHeader(this._unprotectedHeader)
          .setUnprotectedHeader(recipient.unprotectedHeader!)
          .setKeyManagementParameters({ p2c })
          .encrypt(recipient.key, {
            ...recipient.options,
            // @ts-expect-error
            [unprotected]: true,
          });

        jwe.ciphertext = flattened.ciphertext;
        jwe.iv = flattened.iv;
        jwe.tag = flattened.tag;

        if (flattened.aad) jwe.aad = flattened.aad;
        if (flattened.protected) jwe.protected = flattened.protected;
        if (flattened.unprotected) jwe.unprotected = flattened.unprotected;

        target.encrypted_key = flattened.encrypted_key!;
        if (flattened.header) target.header = flattened.header;

        continue;
      }

      const { encryptedKey, parameters } = await encryptKeyManagement(
        recipient.unprotectedHeader?.alg! ||
          this._protectedHeader?.alg! ||
          this._unprotectedHeader?.alg!,
        enc,
        recipient.key,
        cek,
        { p2c },
      );
      target.encrypted_key = base64url(encryptedKey!);
      if (recipient.unprotectedHeader || parameters) {
        target.header = { ...recipient.unprotectedHeader, ...parameters };
      }
    }

    return jwe as GeneralJWE;
  }
}
