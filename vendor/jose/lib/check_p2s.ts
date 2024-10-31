import { JWEInvalid } from "../util/errors.ts";

export default function checkP2s(p2s: Uint8Array) {
  if (!(p2s instanceof Uint8Array) || p2s.length < 8) {
    throw new JWEInvalid("PBES2 Salt Input must be 8 or more octets");
  }
}
