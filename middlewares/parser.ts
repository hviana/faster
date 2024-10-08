/*
Created by: Henrique Emanoel Viana
Githu: https://github.com/hviana
Page: https://sites.google.com/view/henriqueviana
cel: +55 (41) 99999-4664
*/

import { Context, NextFunc, ProcessorFunc } from "../server.ts";
const reqParsers: { [key: string]: ProcessorFunc } = {};
const resParsers: { [key: string]: ProcessorFunc } = {
  "json": (ctx: Context) => {
    ctx.res.headers.set("Content-Type", "application/json");
    ctx.res.body = JSON.stringify(ctx.res.body);
  },
  "html": (ctx: Context) => {
    ctx.res.headers.set("Content-Type", "text/html");
    ctx.res.body = ctx.res.body;
  },
  "javascript": (ctx: Context) => {
    ctx.res.headers.set("Content-Type", "application/javascript");
    ctx.res.body = ctx.res.body;
  },
};

export function res(type: string) {
  return async (ctx: Context, next: NextFunc) => {
    if (!resParsers[type]) {
      throw new Error(`Response body parser: '${type}' not supported.`);
    }
    ctx.postProcessors.add(resParsers[type]);
    await next();
  };
}
export function req(type: string) {
  return async (ctx: Context, next: NextFunc) => {
    if (ctx.req.bodyUsed) {
      return;
    }
    //@ts-ignore
    if (ctx.req[type]) {
      //native JavaScript parser
      //@ts-ignore
      ctx.body = await ctx.req[type]();
    } else if (reqParsers[type]) {
      await reqParsers[type](ctx);
    } else {
      throw new Error(`Request body parser: '${type}' not supported.`);
    }
    await next();
  };
}
