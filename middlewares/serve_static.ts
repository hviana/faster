/*
Created by: Henrique Emanoel Viana
Githu: https://github.com/hviana
Page: https://sites.google.com/view/henriqueviana
cel: +55 (41) 99999-4664
*/

import { Context, NextFunc } from "../server.ts";
import { join, toReadableStream } from "../deps.ts";
export function serveStatic(root: string) {
  return async (ctx: Context, next: NextFunc) => {
    try {
      const file = await Deno.open(
        join(root, ctx.params.wild),
        { read: true },
      );
      ctx.res.body = toReadableStream(file);
      await next();
    } catch (e) {
      ctx.res.status = 404;
    }
  };
}
