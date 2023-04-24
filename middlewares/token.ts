/*
Created by: Henrique Emanoel Viana
Githu: https://github.com/hviana
Page: https://sites.google.com/view/henriqueviana
cel: +55 (41) 99999-4664
*/

import { Context, NextFunc } from "../server.ts";
import { generateSecret, jwtVerify, SignJWT } from "../deps.ts";
const randomKey = await generateSecret("HS256");
export class Token {
  static #configs: any = {
    key: randomKey,
    issuer: "urn:faster:issuer",
    audience: "urn:faster:audience",
    alg: "HS256",
    oneHour: "1h",
  };
  static setConfigs(configs: any) {
    Token.#configs = { ...Token.#configs, ...configs };
  }
  static setSecret(secret: string) {
    Token.#configs.key = (new TextEncoder()).encode(secret);
  }
  static async getPayload(token: string) {
    const { payload, protectedHeader } = await jwtVerify(
      token,
      Token.#configs.key,
    );
    return payload;
  }
  static async middleware(ctx: Context, next: NextFunc) {
    try {
      const authHeader = ctx.req.headers.get("authorization");
      const token = authHeader && authHeader.split(" ")[1];
      if (!token) {
        throw new Error("Token not found.");
      }
      ctx.extra.tokenPayload = await Token.getPayload(token);
      ctx.extra.token = token;
      await next();
    } catch (e) {
      ctx.res.headers.set("Content-Type", "application/json");
      ctx.res.status = 403;
      ctx.res.body = JSON.stringify({
        msg: (e.message || e),
      });
    }
  }
  static async generate(data: any = {}, exp = Token.#configs.oneHour) {
    const jwt = await new SignJWT(data)
      .setProtectedHeader({ alg: Token.#configs.alg })
      .setIssuedAt()
      .setIssuer(Token.#configs.issuer)
      .setAudience(Token.#configs.audience);
    if (exp) {
      jwt.setExpirationTime(exp);
    }
    return jwt.sign(Token.#configs.key);
  }
}
