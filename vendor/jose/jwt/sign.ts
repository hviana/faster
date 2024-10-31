import { CompactSign } from "../jws/compact/sign.ts";
import { JWTInvalid } from "../util/errors.ts";
import type {
  JWK,
  JWTHeaderParameters,
  KeyLike,
  SignOptions,
} from "../types.d.ts";
import { encoder } from "../lib/buffer_utils.ts";
import { ProduceJWT } from "./produce.ts";

/**
 * The SignJWT class is used to build and sign Compact JWS formatted JSON Web Tokens.
 *
 * This class is exported (as a named export) from the main `'jose'` module entry point as well as
 * from its subpath export `'jose/jwt/sign'`.
 */
export class SignJWT extends ProduceJWT {
  private _protectedHeader!: JWTHeaderParameters;

  /**
   * Sets the JWS Protected Header on the SignJWT object.
   *
   * @param protectedHeader JWS Protected Header. Must contain an "alg" (JWS Algorithm) property.
   */
  setProtectedHeader(protectedHeader: JWTHeaderParameters): this {
    this._protectedHeader = protectedHeader;
    return this;
  }

  /**
   * Signs and returns the JWT.
   *
   * @param key Private Key or Secret to sign the JWT with. See
   *   {@link https://github.com/panva/jose/issues/210#jws-alg Algorithm Key Requirements}.
   * @param options JWT Sign options.
   */
  async sign(
    key: KeyLike | Uint8Array | JWK,
    options?: SignOptions,
  ): Promise<string> {
    const sig = new CompactSign(encoder.encode(JSON.stringify(this._payload)));
    sig.setProtectedHeader(this._protectedHeader);
    if (
      Array.isArray(this._protectedHeader?.crit) &&
      this._protectedHeader.crit.includes("b64") &&
      // @ts-expect-error
      this._protectedHeader.b64 === false
    ) {
      throw new JWTInvalid("JWTs MUST NOT use unencoded payload");
    }
    return sig.sign(key, options);
  }
}
