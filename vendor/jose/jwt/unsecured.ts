/**
 * Unsecured (unsigned & unencrypted) JSON Web Tokens (JWT)
 *
 * @module
 */

import * as b64u from "../util/base64url.js";

import type * as types from "../types.d.ts";
import { decoder } from "../lib/buffer_utils.js";
import { JWTInvalid } from "../util/errors.js";
import jwtPayload from "../lib/jwt_claims_set.js";
import { ProduceJWT } from "./produce.js";

/** Result of decoding an Unsecured JWT. */
export interface UnsecuredResult<PayloadType = types.JWTPayload> {
  payload: PayloadType & types.JWTPayload;
  header: types.JWSHeaderParameters;
}

/**
 * The UnsecuredJWT class is a utility for dealing with `{ "alg": "none" }` Unsecured JWTs.
 *
 * This class is exported (as a named export) from the main `'jose'` module entry point as well as
 * from its subpath export `'jose/jwt/unsecured'`.
 *
 * @example
 *
 * Encoding
 *
 * ```js
 * const unsecuredJwt = new jose.UnsecuredJWT({ 'urn:example:claim': true })
 *   .setIssuedAt()
 *   .setIssuer('urn:example:issuer')
 *   .setAudience('urn:example:audience')
 *   .setExpirationTime('2h')
 *   .encode()
 *
 * console.log(unsecuredJwt)
 * ```
 *
 * @example
 *
 * Decoding
 *
 * ```js
 * const payload = jose.UnsecuredJWT.decode(unsecuredJwt, {
 *   issuer: 'urn:example:issuer',
 *   audience: 'urn:example:audience',
 * })
 *
 * console.log(payload)
 * ```
 */
export class UnsecuredJWT extends ProduceJWT {
  /** Encodes the Unsecured JWT. */
  encode(): string {
    const header = b64u.encode(JSON.stringify({ alg: "none" }));
    const payload = b64u.encode(JSON.stringify(this._payload));

    return `${header}.${payload}.`;
  }

  /**
   * Decodes an unsecured JWT.
   *
   * @param jwt Unsecured JWT to decode the payload of.
   * @param options JWT Claims Set validation options.
   */
  static decode<PayloadType = types.JWTPayload>(
    jwt: string,
    options?: types.JWTClaimVerificationOptions,
  ): UnsecuredResult<PayloadType> {
    if (typeof jwt !== "string") {
      throw new JWTInvalid("Unsecured JWT must be a string");
    }
    const { 0: encodedHeader, 1: encodedPayload, 2: signature, length } = jwt
      .split(".");

    if (length !== 3 || signature !== "") {
      throw new JWTInvalid("Invalid Unsecured JWT");
    }

    let header: types.JWSHeaderParameters;
    try {
      header = JSON.parse(decoder.decode(b64u.decode(encodedHeader)));
      if (header.alg !== "none") throw new Error();
    } catch {
      throw new JWTInvalid("Invalid Unsecured JWT");
    }

    const payload = jwtPayload(
      header,
      b64u.decode(encodedPayload),
      options,
    ) as UnsecuredResult<PayloadType>["payload"];

    return { payload, header };
  }
}
