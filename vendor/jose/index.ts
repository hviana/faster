export { compactDecrypt } from "./jwe/compact/decrypt.js";
export type { CompactDecryptGetKey } from "./jwe/compact/decrypt.js";
export { flattenedDecrypt } from "./jwe/flattened/decrypt.js";
export type { FlattenedDecryptGetKey } from "./jwe/flattened/decrypt.js";
export { generalDecrypt } from "./jwe/general/decrypt.js";
export type { GeneralDecryptGetKey } from "./jwe/general/decrypt.js";
export { GeneralEncrypt } from "./jwe/general/encrypt.js";
export type { Recipient } from "./jwe/general/encrypt.js";

export { compactVerify } from "./jws/compact/verify.js";
export type { CompactVerifyGetKey } from "./jws/compact/verify.js";
export { flattenedVerify } from "./jws/flattened/verify.js";
export type { FlattenedVerifyGetKey } from "./jws/flattened/verify.js";
export { generalVerify } from "./jws/general/verify.js";
export type { GeneralVerifyGetKey } from "./jws/general/verify.js";

export { jwtVerify } from "./jwt/verify.js";
export type { JWTVerifyGetKey, JWTVerifyOptions } from "./jwt/verify.js";
export { jwtDecrypt } from "./jwt/decrypt.js";
export type { JWTDecryptGetKey, JWTDecryptOptions } from "./jwt/decrypt.js";
export type { ProduceJWT } from "./jwt/produce.js";

export { CompactEncrypt } from "./jwe/compact/encrypt.js";
export { FlattenedEncrypt } from "./jwe/flattened/encrypt.js";

export { CompactSign } from "./jws/compact/sign.js";
export { FlattenedSign } from "./jws/flattened/sign.js";
export { GeneralSign } from "./jws/general/sign.js";
export type { Signature } from "./jws/general/sign.js";

export { SignJWT } from "./jwt/sign.js";
export { EncryptJWT } from "./jwt/encrypt.js";

export {
  calculateJwkThumbprint,
  calculateJwkThumbprintUri,
} from "./jwk/thumbprint.js";
export { EmbeddedJWK } from "./jwk/embedded.js";

export { createLocalJWKSet } from "./jwks/local.js";
export { createRemoteJWKSet, customFetch, jwksCache } from "./jwks/remote.js";
export type {
  ExportedJWKSCache,
  FetchImplementation,
  JWKSCacheInput,
  RemoteJWKSetOptions,
} from "./jwks/remote.js";

export { UnsecuredJWT } from "./jwt/unsecured.js";
export type { UnsecuredResult } from "./jwt/unsecured.js";

export { exportJWK, exportPKCS8, exportSPKI } from "./key/export.js";

export {
  importJWK,
  importPKCS8,
  importSPKI,
  importX509,
} from "./key/import.js";
export type { KeyImportOptions } from "./key/import.js";

export { decodeProtectedHeader } from "./util/decode_protected_header.js";
export { decodeJwt } from "./util/decode_jwt.js";
export type { ProtectedHeaderParameters } from "./util/decode_protected_header.js";

export * as errors from "./util/errors.js";

export { generateKeyPair } from "./key/generate_key_pair.js";
export type {
  GenerateKeyPairOptions,
  GenerateKeyPairResult,
} from "./key/generate_key_pair.js";
export { generateSecret } from "./key/generate_secret.js";
export type { GenerateSecretOptions } from "./key/generate_secret.js";

export * as base64url from "./util/base64url.js";

export type {
  CompactDecryptResult,
  CompactJWEHeaderParameters,
  CompactJWSHeaderParameters,
  CompactVerifyResult,
  CritOption,
  CryptoKey,
  DecryptOptions,
  EncryptOptions,
  FlattenedDecryptResult,
  FlattenedJWE,
  FlattenedJWS,
  FlattenedJWSInput,
  FlattenedVerifyResult,
  GeneralDecryptResult,
  GeneralJWE,
  GeneralJWS,
  GeneralJWSInput,
  GeneralVerifyResult,
  GetKeyFunction,
  JoseHeaderParameters,
  JSONWebKeySet,
  JWEHeaderParameters,
  JWEKeyManagementHeaderParameters,
  JWK,
  JWK_EC_Private,
  JWK_EC_Public,
  JWK_oct,
  JWK_OKP_Private,
  JWK_OKP_Public,
  JWK_RSA_Private,
  JWK_RSA_Public,
  JWKParameters,
  JWSHeaderParameters,
  JWTClaimVerificationOptions,
  JWTDecryptResult,
  JWTHeaderParameters,
  JWTPayload,
  JWTVerifyResult,
  KeyObject,
  ResolvedKey,
  SignOptions,
  VerifyOptions,
} from "./types.d.ts";

/**
 * In prior releases this indicated whether a Node.js-specific build was loaded, this is now fixed
 * to `"WebCryptoAPI"`
 *
 * @deprecated
 */
export const cryptoRuntime = "WebCryptoAPI";
