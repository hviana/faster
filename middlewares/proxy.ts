/*
Created by: Henrique Emanoel Viana
Githu: https://github.com/hviana
Page: https://sites.google.com/view/henriqueviana
cel: +55 (41) 99999-4664
*/

import { Context, NextFunc, RouteFn } from "../server.ts";

interface ProxyOptions {
  url: string | ((ctx: Context) => string | Promise<string>);
  replaceReqAndRes?: boolean;
  replaceProxyPath?: boolean;
  condition?: (context: Context) => Promise<boolean> | boolean;
}

const defaultProxyOptions: ProxyOptions = {
  url: "",
  replaceReqAndRes: true,
  replaceProxyPath: true,
  condition: (ctx: Context) => true,
};

export function proxy(
  options: ProxyOptions = defaultProxyOptions,
): RouteFn {
  const mergedOptions = { ...defaultProxyOptions, ...options };
  return async (ctx: Context, next: NextFunc) => {
    if (await mergedOptions.condition!(ctx)) {
      let url = "";
      if (typeof mergedOptions.url === "function") {
        url = await mergedOptions.url(ctx);
      } else {
        url = mergedOptions.url;
      }
      ctx.extra.proxied = true;
      const proxyURL = new URL(url);
      if (mergedOptions.replaceProxyPath) {
        proxyURL.pathname = ctx.url.pathname;
        proxyURL.search = ctx.url.search;
        proxyURL.hash = ctx.url.hash;
      }
      const newRequest: Request = new Request(proxyURL.toString(), {
        method: ctx.req.method,
        headers: ctx.req.headers,
        body: ctx.req.bodyUsed ? ctx.body : ctx.req.body,
        referrer: ctx.req.referrer,
        referrerPolicy: ctx.req.referrerPolicy,
        mode: ctx.req.mode,
        credentials: ctx.req.credentials,
        cache: ctx.req.cache,
        redirect: ctx.req.redirect,
        integrity: ctx.req.integrity,
      });
      const newRes = await fetch(newRequest);
      if (mergedOptions.replaceReqAndRes) {
        ctx.req = newRequest;
        ctx.res.status = newRes.status;
        ctx.res.statusText = newRes.statusText;
        ctx.res.headers = new Headers(
          Object.fromEntries(newRes.headers.entries()),
        );
        ctx.res.body = newRes.body;
      } else {
        ctx.extra.proxyReq = newRequest;
        ctx.extra.proxyRes = newRes;
      }
    }
    await next();
  };
}
