/*
Created by: Henrique Emanoel Viana
Githu: https://github.com/hviana
Page: https://sites.google.com/view/henriqueviana
cel: +55 (41) 99999-4664
*/

import { Context, NextFunc } from "../server.ts";

//server.options("/path",setCORS()); // necessary enable pre-fligh request on "/path"
export function setCORS(origin: string = "*") {
  return async (ctx: Context, next: NextFunc) => {
    ctx.res.headers.set(
      "Access-Control-Expose-Headers",
      "*, Authorization",
    );
    ctx.res.headers.set("Access-Control-Allow-Credentials", "true");
    ctx.res.headers.set("Access-Control-Allow-Origin", origin);
    ctx.res.headers.set(
      "Access-Control-Allow-Methods",
      "GET,PUT,POST,DELETE,PATCH,HEAD,OPTIONS",
    );
    ctx.res.headers.set("Access-Control-Allow-Headers", "*, Authorization");
    await next();
  };
}
