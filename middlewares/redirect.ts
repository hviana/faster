/*
Created by: Henrique Emanoel Viana
Githu: https://github.com/hviana
Page: https://sites.google.com/view/henriqueviana
cel: +55 (41) 99999-4664
*/

import { Context, NextFunc } from "../server.ts";
export function redirect(url: string) {
  return async (ctx: Context, next: NextFunc) => {
    ctx.redirect(url);
    await next();
  };
}
