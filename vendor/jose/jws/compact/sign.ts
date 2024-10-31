import { FlattenedSign } from "../flattened/sign.ts";
import type {
  CompactJWSHeaderParameters,
  JWK,
  KeyLike,
  SignOptions,
} from "../../types.d.ts";

/**
 * The CompactSign class is used to build and sign Compact JWS strings.
 *
 * This class is exported (as a named export) from the main `'jose'` module entry point as well as
 * from its subpath export `'jose/jws/compact/sign'`.
 */
export class CompactSign {
  private _flattened: FlattenedSign;

  /** @param payload Binary representation of the payload to sign. */
  constructor(payload: Uint8Array) {
    this._flattened = new FlattenedSign(payload);
  }

  /**
   * Sets the JWS Protected Header on the Sign object.
   *
   * @param protectedHeader JWS Protected Header.
   */
  setProtectedHeader(protectedHeader: CompactJWSHeaderParameters): this {
    this._flattened.setProtectedHeader(protectedHeader);
    return this;
  }

  /**
   * Signs and resolves the value of the Compact JWS string.
   *
   * @param key Private Key or Secret to sign the JWS with. See
   *   {@link https://github.com/panva/jose/issues/210#jws-alg Algorithm Key Requirements}.
   * @param options JWS Sign options.
   */
  async sign(
    key: KeyLike | Uint8Array | JWK,
    options?: SignOptions,
  ): Promise<string> {
    const jws = await this._flattened.sign(key, options);

    if (jws.payload === undefined) {
      throw new TypeError(
        "use the flattened module for creating JWS with b64: false",
      );
    }

    return `${jws.protected}.${jws.payload}.${jws.signature}`;
  }
}
