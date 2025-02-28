import { JOSENotSupported } from "../util/errors.js";

export function bitLength(alg: string) {
  switch (alg) {
    case "A128GCM":
      return 128;
    case "A192GCM":
      return 192;
    case "A256GCM":
    case "A128CBC-HS256":
      return 256;
    case "A192CBC-HS384":
      return 384;
    case "A256CBC-HS512":
      return 512;
    default:
      throw new JOSENotSupported(`Unsupported JWE Algorithm: ${alg}`);
  }
}
export default (alg: string): Uint8Array =>
  crypto.getRandomValues(new Uint8Array(bitLength(alg) >> 3));
