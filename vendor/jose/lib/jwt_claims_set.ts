import type * as types from "../types.d.ts";
import {
  JWTClaimValidationFailed,
  JWTExpired,
  JWTInvalid,
} from "../util/errors.js";
import { decoder } from "./buffer_utils.js";
import epoch from "./epoch.js";
import secs from "./secs.js";
import isObject from "./is_object.js";

const normalizeTyp = (value: string) =>
  value.toLowerCase().replace(/^application\//, "");

const checkAudiencePresence = (audPayload: unknown, audOption: unknown[]) => {
  if (typeof audPayload === "string") {
    return audOption.includes(audPayload);
  }

  if (Array.isArray(audPayload)) {
    // Each principal intended to process the JWT MUST
    // identify itself with a value in the audience claim
    return audOption.some(Set.prototype.has.bind(new Set(audPayload)));
  }

  return false;
};

export default (
  protectedHeader: types.JWEHeaderParameters | types.JWSHeaderParameters,
  encodedPayload: Uint8Array,
  options: types.JWTClaimVerificationOptions = {},
) => {
  let payload!: { [propName: string]: unknown };
  try {
    payload = JSON.parse(decoder.decode(encodedPayload));
  } catch {
    //
  }

  if (!isObject(payload)) {
    throw new JWTInvalid("JWT Claims Set must be a top-level JSON object");
  }

  const { typ } = options;
  if (
    typ &&
    (typeof protectedHeader!.typ !== "string" ||
      normalizeTyp(protectedHeader!.typ) !== normalizeTyp(typ))
  ) {
    throw new JWTClaimValidationFailed(
      'unexpected "typ" JWT header value',
      payload,
      "typ",
      "check_failed",
    );
  }

  const { requiredClaims = [], issuer, subject, audience, maxTokenAge } =
    options;

  const presenceCheck = [...requiredClaims];

  if (maxTokenAge !== undefined) presenceCheck.push("iat");
  if (audience !== undefined) presenceCheck.push("aud");
  if (subject !== undefined) presenceCheck.push("sub");
  if (issuer !== undefined) presenceCheck.push("iss");

  for (const claim of new Set(presenceCheck.reverse())) {
    if (!(claim in payload)) {
      throw new JWTClaimValidationFailed(
        `missing required "${claim}" claim`,
        payload,
        claim,
        "missing",
      );
    }
  }

  if (
    issuer &&
    !((Array.isArray(issuer) ? issuer : [issuer]) as unknown[]).includes(
      payload.iss!,
    )
  ) {
    throw new JWTClaimValidationFailed(
      'unexpected "iss" claim value',
      payload,
      "iss",
      "check_failed",
    );
  }

  if (subject && payload.sub !== subject) {
    throw new JWTClaimValidationFailed(
      'unexpected "sub" claim value',
      payload,
      "sub",
      "check_failed",
    );
  }

  if (
    audience &&
    !checkAudiencePresence(
      payload.aud,
      typeof audience === "string" ? [audience] : audience,
    )
  ) {
    throw new JWTClaimValidationFailed(
      'unexpected "aud" claim value',
      payload,
      "aud",
      "check_failed",
    );
  }

  let tolerance: number;
  switch (typeof options.clockTolerance) {
    case "string":
      tolerance = secs(options.clockTolerance);
      break;
    case "number":
      tolerance = options.clockTolerance;
      break;
    case "undefined":
      tolerance = 0;
      break;
    default:
      throw new TypeError("Invalid clockTolerance option type");
  }

  const { currentDate } = options;
  const now = epoch(currentDate || new Date());

  if (
    (payload.iat !== undefined || maxTokenAge) &&
    typeof payload.iat !== "number"
  ) {
    throw new JWTClaimValidationFailed(
      '"iat" claim must be a number',
      payload,
      "iat",
      "invalid",
    );
  }

  if (payload.nbf !== undefined) {
    if (typeof payload.nbf !== "number") {
      throw new JWTClaimValidationFailed(
        '"nbf" claim must be a number',
        payload,
        "nbf",
        "invalid",
      );
    }
    if (payload.nbf > now + tolerance) {
      throw new JWTClaimValidationFailed(
        '"nbf" claim timestamp check failed',
        payload,
        "nbf",
        "check_failed",
      );
    }
  }

  if (payload.exp !== undefined) {
    if (typeof payload.exp !== "number") {
      throw new JWTClaimValidationFailed(
        '"exp" claim must be a number',
        payload,
        "exp",
        "invalid",
      );
    }
    if (payload.exp <= now - tolerance) {
      throw new JWTExpired(
        '"exp" claim timestamp check failed',
        payload,
        "exp",
        "check_failed",
      );
    }
  }

  if (maxTokenAge) {
    const age = now - payload.iat!;
    const max = typeof maxTokenAge === "number"
      ? maxTokenAge
      : secs(maxTokenAge);

    if (age - tolerance > max) {
      throw new JWTExpired(
        '"iat" claim timestamp check failed (too far in the past)',
        payload,
        "iat",
        "check_failed",
      );
    }

    if (age < 0 - tolerance) {
      throw new JWTClaimValidationFailed(
        '"iat" claim timestamp check failed (it should be in the past)',
        payload,
        "iat",
        "check_failed",
      );
    }
  }

  return payload as types.JWTPayload;
};
