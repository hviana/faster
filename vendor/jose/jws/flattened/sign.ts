import { encode as base64url } from "../../runtime/base64url.ts";
import sign from "../../runtime/sign.ts";

import isDisjoint from "../../lib/is_disjoint.ts";
import { JWSInvalid } from "../../util/errors.ts";
import { concat, decoder, encoder } from "../../lib/buffer_utils.ts";
import type {
  FlattenedJWS,
  JWK,
  JWSHeaderParameters,
  KeyLike,
  SignOptions,
} from "../../types.d.ts";
import { checkKeyTypeWithJwk } from "../../lib/check_key_type.ts";
import validateCrit from "../../lib/validate_crit.ts";

/**
 * The FlattenedSign class is used to build and sign Flattened JWS objects.
 *
 * This class is exported (as a named export) from the main `'jose'` module entry point as well as
 * from its subpath export `'jose/jws/flattened/sign'`.
 */
export class FlattenedSign {
  private _payload: Uint8Array;

  private _protectedHeader!: JWSHeaderParameters;

  private _unprotectedHeader!: JWSHeaderParameters;

  /** @param payload Binary representation of the payload to sign. */
  constructor(payload: Uint8Array) {
    if (!(payload instanceof Uint8Array)) {
      throw new TypeError("payload must be an instance of Uint8Array");
    }
    this._payload = payload;
  }

  /**
   * Sets the JWS Protected Header on the FlattenedSign object.
   *
   * @param protectedHeader JWS Protected Header.
   */
  setProtectedHeader(protectedHeader: JWSHeaderParameters): this {
    if (this._protectedHeader) {
      throw new TypeError("setProtectedHeader can only be called once");
    }
    this._protectedHeader = protectedHeader;
    return this;
  }

  /**
   * Sets the JWS Unprotected Header on the FlattenedSign object.
   *
   * @param unprotectedHeader JWS Unprotected Header.
   */
  setUnprotectedHeader(unprotectedHeader: JWSHeaderParameters): this {
    if (this._unprotectedHeader) {
      throw new TypeError("setUnprotectedHeader can only be called once");
    }
    this._unprotectedHeader = unprotectedHeader;
    return this;
  }

  /**
   * Signs and resolves the value of the Flattened JWS object.
   *
   * @param key Private Key or Secret to sign the JWS with. See
   *   {@link https://github.com/panva/jose/issues/210#jws-alg Algorithm Key Requirements}.
   * @param options JWS Sign options.
   */
  async sign(
    key: KeyLike | Uint8Array | JWK,
    options?: SignOptions,
  ): Promise<FlattenedJWS> {
    if (!this._protectedHeader && !this._unprotectedHeader) {
      throw new JWSInvalid(
        "either setProtectedHeader or setUnprotectedHeader must be called before #sign()",
      );
    }

    if (!isDisjoint(this._protectedHeader, this._unprotectedHeader)) {
      throw new JWSInvalid(
        "JWS Protected and JWS Unprotected Header Parameter names must be disjoint",
      );
    }

    const joseHeader: JWSHeaderParameters = {
      ...this._protectedHeader,
      ...this._unprotectedHeader,
    };

    const extensions = validateCrit(
      JWSInvalid,
      new Map([["b64", true]]),
      options?.crit,
      this._protectedHeader,
      joseHeader,
    );

    let b64 = true;
    if (extensions.has("b64")) {
      b64 = this._protectedHeader.b64!;
      if (typeof b64 !== "boolean") {
        throw new JWSInvalid(
          'The "b64" (base64url-encode payload) Header Parameter must be a boolean',
        );
      }
    }

    const { alg } = joseHeader;

    if (typeof alg !== "string" || !alg) {
      throw new JWSInvalid(
        'JWS "alg" (Algorithm) Header Parameter missing or invalid',
      );
    }

    checkKeyTypeWithJwk(alg, key, "sign");

    let payload = this._payload;
    if (b64) {
      payload = encoder.encode(base64url(payload));
    }

    let protectedHeader: Uint8Array;
    if (this._protectedHeader) {
      protectedHeader = encoder.encode(
        base64url(JSON.stringify(this._protectedHeader)),
      );
    } else {
      protectedHeader = encoder.encode("");
    }

    const data = concat(protectedHeader, encoder.encode("."), payload);

    const signature = await sign(alg, key, data);

    const jws: FlattenedJWS = {
      signature: base64url(signature),
      payload: "",
    };

    if (b64) {
      jws.payload = decoder.decode(payload);
    }

    if (this._unprotectedHeader) {
      jws.header = this._unprotectedHeader;
    }

    if (this._protectedHeader) {
      jws.protected = decoder.decode(protectedHeader);
    }

    return jws;
  }
}
