import { isJWK } from "../lib/is_jwk.ts";
import type { JWK, KeyLike } from "../types.d.ts";
import { decode } from "./base64url.ts";
import importJWK from "./jwk_to_key.ts";

const exportKeyValue = (k: string) => decode(k);

let privCache: WeakMap<object, Record<string, CryptoKey>>;
let pubCache: WeakMap<object, Record<string, CryptoKey>>;

const isKeyObject = (key: unknown): key is KeyLike => {
  // @ts-expect-error
  return key?.[Symbol.toStringTag] === "KeyObject";
};

const importAndCache = async (
  cache: typeof privCache | typeof pubCache,
  key: KeyLike | JWK,
  jwk: JWK,
  alg: string,
  freeze = false,
) => {
  let cached = cache.get(key);
  if (cached?.[alg]) {
    return cached[alg];
  }

  const cryptoKey = await importJWK({ ...jwk, alg });
  if (freeze) Object.freeze(key);
  if (!cached) {
    cache.set(key, { [alg]: cryptoKey });
  } else {
    cached[alg] = cryptoKey;
  }
  return cryptoKey;
};

const normalizePublicKey = (
  key: KeyLike | Uint8Array | JWK | unknown,
  alg: string,
) => {
  if (isKeyObject(key)) {
    // @ts-expect-error
    let jwk: JWK = key.export({ format: "jwk" });
    delete jwk.d;
    delete jwk.dp;
    delete jwk.dq;
    delete jwk.p;
    delete jwk.q;
    delete jwk.qi;
    if (jwk.k) {
      return exportKeyValue(jwk.k);
    }

    pubCache ||= new WeakMap();
    return importAndCache(pubCache, key, jwk, alg);
  }

  if (isJWK(key)) {
    if (key.k) return decode(key.k);
    pubCache ||= new WeakMap();
    const cryptoKey = importAndCache(pubCache, key, key, alg, true);
    return cryptoKey;
  }

  return key as KeyLike | Uint8Array;
};

const normalizePrivateKey = (
  key: KeyLike | Uint8Array | JWK | unknown,
  alg: string,
) => {
  if (isKeyObject(key)) {
    // @ts-expect-error
    let jwk: JWK = key.export({ format: "jwk" });
    if (jwk.k) {
      return exportKeyValue(jwk.k);
    }

    privCache ||= new WeakMap();
    return importAndCache(privCache, key, jwk, alg);
  }

  if (isJWK(key)) {
    if (key.k) return decode(key.k);
    privCache ||= new WeakMap();
    const cryptoKey = importAndCache(privCache, key, key, alg, true);
    return cryptoKey;
  }

  return key as KeyLike | Uint8Array;
};

export default { normalizePublicKey, normalizePrivateKey };
