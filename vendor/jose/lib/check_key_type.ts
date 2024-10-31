import { withAlg as invalidKeyInput } from "./invalid_key_input.ts";
import isKeyLike, { types } from "../runtime/is_key_like.ts";
import * as jwk from "./is_jwk.ts";
import { JWK } from "../types.d.ts";

// @ts-expect-error
const tag = (key: unknown): string => key?.[Symbol.toStringTag];

const jwkMatchesOp = (alg: string, key: JWK, usage: Usage) => {
  if (key.use !== undefined && key.use !== "sig") {
    throw new TypeError(
      "Invalid key for this operation, when present its use must be sig",
    );
  }

  if (key.key_ops !== undefined && key.key_ops.includes?.(usage) !== true) {
    throw new TypeError(
      `Invalid key for this operation, when present its key_ops must include ${usage}`,
    );
  }

  if (key.alg !== undefined && key.alg !== alg) {
    throw new TypeError(
      `Invalid key for this operation, when present its alg must be ${alg}`,
    );
  }

  return true;
};

const symmetricTypeCheck = (
  alg: string,
  key: unknown,
  usage: Usage,
  allowJwk: boolean,
) => {
  if (key instanceof Uint8Array) return;

  if (allowJwk && jwk.isJWK(key)) {
    if (jwk.isSecretJWK(key) && jwkMatchesOp(alg, key, usage)) return;
    throw new TypeError(
      `JSON Web Key for symmetric algorithms must have JWK "kty" (Key Type) equal to "oct" and the JWK "k" (Key Value) present`,
    );
  }

  if (!isKeyLike(key)) {
    throw new TypeError(
      invalidKeyInput(
        alg,
        key,
        ...types,
        "Uint8Array",
        allowJwk ? "JSON Web Key" : null,
      ),
    );
  }

  if (key.type !== "secret") {
    throw new TypeError(
      `${tag(key)} instances for symmetric algorithms must be of type "secret"`,
    );
  }
};

const asymmetricTypeCheck = (
  alg: string,
  key: unknown,
  usage: Usage,
  allowJwk: boolean,
) => {
  if (allowJwk && jwk.isJWK(key)) {
    switch (usage) {
      case "sign":
        if (jwk.isPrivateJWK(key) && jwkMatchesOp(alg, key, usage)) return;
        throw new TypeError(`JSON Web Key for this operation be a private JWK`);
      case "verify":
        if (jwk.isPublicJWK(key) && jwkMatchesOp(alg, key, usage)) return;
        throw new TypeError(`JSON Web Key for this operation be a public JWK`);
    }
  }

  if (!isKeyLike(key)) {
    throw new TypeError(
      invalidKeyInput(alg, key, ...types, allowJwk ? "JSON Web Key" : null),
    );
  }

  if (key.type === "secret") {
    throw new TypeError(
      `${
        tag(key)
      } instances for asymmetric algorithms must not be of type "secret"`,
    );
  }

  if (usage === "sign" && key.type === "public") {
    throw new TypeError(
      `${
        tag(key)
      } instances for asymmetric algorithm signing must be of type "private"`,
    );
  }

  if (usage === "decrypt" && key.type === "public") {
    throw new TypeError(
      `${
        tag(key)
      } instances for asymmetric algorithm decryption must be of type "private"`,
    );
  }

  // KeyObject allows this but CryptoKey does not.
  if (
    (key as CryptoKey).algorithm && usage === "verify" && key.type === "private"
  ) {
    throw new TypeError(
      `${
        tag(key)
      } instances for asymmetric algorithm verifying must be of type "public"`,
    );
  }

  // KeyObject allows this but CryptoKey does not.
  if (
    (key as CryptoKey).algorithm && usage === "encrypt" &&
    key.type === "private"
  ) {
    throw new TypeError(
      `${
        tag(key)
      } instances for asymmetric algorithm encryption must be of type "public"`,
    );
  }
};

type Usage = "sign" | "verify" | "encrypt" | "decrypt";

function checkKeyType(
  allowJwk: boolean,
  alg: string,
  key: unknown,
  usage: Usage,
): void {
  const symmetric = alg.startsWith("HS") ||
    alg === "dir" ||
    alg.startsWith("PBES2") ||
    /^A\d{3}(?:GCM)?KW$/.test(alg);

  if (symmetric) {
    symmetricTypeCheck(alg, key, usage, allowJwk);
  } else {
    asymmetricTypeCheck(alg, key, usage, allowJwk);
  }
}

export default checkKeyType.bind(undefined, false);
export const checkKeyTypeWithJwk = checkKeyType.bind(undefined, true);