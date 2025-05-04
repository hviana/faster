/*
Created by: Henrique Emanoel Viana
Githu: https://github.com/hviana
Page: https://sites.google.com/view/henriqueviana
cel: +55 (41) 99999-4664
*/

import { Context, NextFunc } from "../server.ts";
import { jose } from "../deps.ts";
const randomKey = await jose.generateSecret("HS256");
export class Token {
  static _configs: any = {
    key: randomKey,
    issuer: "urn:faster:issuer",
    audience: "urn:faster:audience",
    alg: "HS256",
    oneHour: "1h",
  };
  static setConfigs(configs: any): void {
    Token._configs = { ...Token._configs, ...configs };
  }
  static setSecret(secret: string): void {
    Token._configs.key = (new TextEncoder()).encode(secret);
  }
  static async getPayload(token: string): Promise<any> {
    const { payload, protectedHeader } = await jose.jwtVerify(
      token,
      Token._configs.key,
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
    } catch (e: any) {
      ctx.res.headers.set("Content-Type", "application/json");
      ctx.res.status = 403;
      ctx.res.body = JSON.stringify({
        msg: (e.message || e),
      });
    }
  }
  static async generate(
    data: any = {},
    exp = Token._configs.oneHour,
  ): Promise<string> {
    const jwt = await new jose.SignJWT(data)
      .setProtectedHeader({ alg: Token._configs.alg })
      .setIssuedAt()
      .setIssuer(Token._configs.issuer)
      .setAudience(Token._configs.audience);
    if (exp) {
      jwt.setExpirationTime(exp);
    }
    return jwt.sign(Token._configs.key);
  }
}
