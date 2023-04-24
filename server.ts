/*
Created by: Henrique Emanoel Viana
Githu: https://github.com/hviana
Page: https://sites.google.com/view/henriqueviana
cel: +55 (41) 99999-4664
*/

export type Params = {
  [key: string]: string;
};

export type ProcessorFunc = (ctx: Context) => Promise<void> | void;

export type ContextResponse = {
  body: any;
  headers: Headers;
  status: number;
  statusText: string;
};

export class Context {
  #conn: Deno.Conn;
  #httpConn: Deno.HttpConn;
  #requestEvent: Deno.RequestEvent;
  #params: Params;
  #url: URL;
  req: Request;
  body: any = undefined;
  #extra: { [key: string]: any } = {};
  error: Error | undefined = undefined;
  #postProcessors: Set<ProcessorFunc> = new Set();
  constructor(
    conn: Deno.Conn,
    httpConn: Deno.HttpConn,
    requestEvent: Deno.RequestEvent,
    params: Params,
    url: URL,
    req: Request,
    hasRoute: boolean,
  ) {
    this.#conn = conn;
    this.#httpConn = httpConn;
    this.#requestEvent = requestEvent;
    this.#params = params;
    this.#url = url;
    this.req = req;
    this.res.status = hasRoute ? 200 : 404;
  }
  res: ContextResponse = {
    body: undefined,
    headers: new Headers(),
    status: 200,
    statusText: "",
  };
  get conn() {
    return this.#conn;
  }
  get httpConn() {
    return this.#httpConn;
  }
  get requestEvent() {
    return this.#requestEvent;
  }
  get params() {
    return this.#params;
  }
  get url() {
    return this.#url;
  }
  get extra() {
    return this.#extra;
  }
  get postProcessors() {
    return this.#postProcessors;
  }
  redirect(url: string) {
    this.postProcessors.add((ctx: Context) => {
      ctx.res.headers.set("Location", url);
      ctx.res.status = 301;
    });
  }
}

export type NextFunc = () => Promise<void> | void;

// Adapted from https://github.com/lukeed/regexparam/blob/master/src/index.js
export function parse(
  str: RegExp | string,
  loose?: boolean,
): { keys: string[]; pattern: RegExp } {
  if (str instanceof RegExp) return { keys: [], pattern: str };
  var c: string,
    o: number,
    tmp: string | undefined,
    ext: number,
    keys = [],
    pattern: string = "",
    arr: string[] = str.split("/");
  arr[0] || arr.shift();

  while (tmp = arr.shift()) {
    c = tmp[0];
    if (c === "*") {
      keys.push("wild");
      pattern += "/(.*)";
    } else if (c === ":") {
      o = tmp.indexOf("?", 1);
      ext = tmp.indexOf(".", 1);
      keys.push(tmp.substring(1, !!~o ? o : !!~ext ? ext : tmp.length));
      pattern += !!~o && !~ext ? "(?:/([^/]+?))?" : "/([^/]+?)";
      if (!!~ext) pattern += (!!~o ? "?" : "") + "\\" + tmp.substring(ext);
    } else {
      pattern += "/" + tmp;
    }
  }

  return {
    keys: keys,
    pattern: new RegExp("^" + pattern + (loose ? "(?=$|\/)" : "\/?$"), "i"),
  };
}

export type RouteFn = (
  ctx: Context,
  next: NextFunc,
) => Promise<void> | void;
type RoutePattern = RegExp;
type Method =
  | "ALL"
  | "GET"
  | "POST"
  | "HEAD"
  | "PATCH"
  | "OPTIONS"
  | "CONNECT"
  | "DELETE"
  | "TRACE"
  | "POST"
  | "PUT";

// A Route is a route when it has a routepattern otherwise it is treated as a middleware.
export type Route = {
  pattern?: RoutePattern;
  method: Method;
  keys: string[];
  handlers: RouteFn[];
};
export class Server {
  // NOTE: This is transpiled into the constructor, therefore equivalent to this.routes = [];
  #routes: Route[] = [];

  // NOTE: Using .bind can significantly increase perf compared to arrow functions.
  public all = this.#add.bind(this, "ALL");
  public get = this.#add.bind(this, "GET");
  public head = this.#add.bind(this, "HEAD");
  public patch = this.#add.bind(this, "PATCH");
  public options = this.#add.bind(this, "OPTIONS");
  public connect = this.#add.bind(this, "CONNECT");
  public delete = this.#add.bind(this, "DELETE");
  public trace = this.#add.bind(this, "TRACE");
  public post = this.#add.bind(this, "POST");
  public put = this.#add.bind(this, "PUT");

  public use(...handlers: RouteFn[]) {
    this.#routes.push({
      keys: [],
      method: "ALL",
      handlers,
    });
    return this;
  }

  #add(method: Method, route: string | RegExp, ...handlers: RouteFn[]) {
    var {
      keys,
      pattern,
    } = parse(route);
    this.#routes.push({
      keys,
      method,
      handlers,
      pattern,
    });
    return this;
  }

  async #middlewareHandler(
    fns: RouteFn[],
    fnIndex: number,
    ctx: Context,
  ): Promise<void> {
    if (fns[fnIndex] !== undefined) {
      try {
        await fns[fnIndex](
          ctx,
          async () => await this.#middlewareHandler(fns, fnIndex + 1, ctx),
        );
      } catch (e) {
        ctx.error = e;
      }
    }
  }

  async #handleRequest(conn: Deno.Conn) {
    try {
      const httpConn = Deno.serveHttp(conn);
      for await (const requestEvent of httpConn) {
        const req = requestEvent.request;
        const url = new URL(requestEvent.request.url);
        const requestHandlers: RouteFn[] = [];
        const params: Params = {};
        const len = this.#routes.length;
        var hasRoute = false;
        for (var i = 0; i < len; i++) {
          const r = this.#routes[i];
          const keyLength = r.keys.length;
          var matches: null | string[] = null;
          if (
            r.pattern === undefined ||
            (req.method === r.method &&
              (matches = r.pattern.exec(
                url.pathname,
              )))
          ) {
            if (r.pattern) {
              hasRoute = true;
              if (keyLength > 0) {
                if (matches) {
                  var inc = 0;
                  while (inc < keyLength) {
                    params[r.keys[inc]] = decodeURIComponent(matches[++inc]);
                  }
                }
              }
            }
            requestHandlers.push(...r.handlers);
          }
        }
        var ctx = new Context(
          conn,
          httpConn,
          requestEvent,
          params,
          url,
          req,
          hasRoute,
        );
        await this.#middlewareHandler(requestHandlers, 0, ctx);
        if (!ctx.error) {
          try {
            for (const p of ctx.postProcessors) {
              await p(ctx);
            }
          } catch (e) {
            ctx.error = e;
          }
        }
        if (ctx.error) {
          ctx.res.status = 500;
          ctx.res.headers.set(
            "Content-Type",
            "application/json",
          );
          ctx.res.body = JSON.stringify({
            msg: (ctx.error.message || ctx.error),
            stack: ctx.error.stack,
          });
        }
        await requestEvent.respondWith(
          new Response(ctx.res.body, {
            headers: ctx.res.headers,
            status: ctx.res.status,
            statusText: ctx.res.statusText,
          }),
        );
      }
    } catch (e) {
      console.log(e);
    }
  }

  public async listen(serverParams: any) {
    const server = (serverParams.certFile || serverParams.port === 443)
      ? Deno.listenTls(serverParams)
      : Deno.listen(serverParams);
    try {
      for await (const conn of server) {
        this.#handleRequest(conn);
      }
    } catch (e) {
      console.log(e);
      if (e.name === "NotConnected") {
        await this.listen(serverParams);
      }
    }
  }
}
