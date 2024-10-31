/*
Created by: Henrique Emanoel Viana
Githu: https://github.com/hviana
Page: https://sites.google.com/view/henriqueviana
cel: +55 (41) 99999-4664
*/
import { DenoKvFs } from "./deps.ts";
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
  #info: Deno.ServeHandlerInfo;
  #params: Params;
  #url: URL;
  req: Request;
  body: any = undefined;
  #extra: { [key: string]: any } = {};
  error: Error | undefined = undefined;
  #postProcessors: Set<ProcessorFunc> = new Set();
  constructor(
    info: Deno.ServeHandlerInfo,
    params: Params,
    url: URL,
    req: Request,
    hasRoute: boolean,
  ) {
    this.#info = info;
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
  get info(): Deno.ServeHandlerInfo {
    return this.#info;
  }
  get params(): Params {
    return this.#params;
  }
  get url(): URL {
    return this.#url;
  }
  get extra(): any {
    return this.#extra;
  }
  get postProcessors(): Set<ProcessorFunc> {
    return this.#postProcessors;
  }
  redirect(...params: any[]): void {
    this.postProcessors.add((ctx: Context) => {
      if (params.length < 2) {
        params.unshift(302);
      }
      ctx.res.headers.set("Location", params[1]);
      ctx.res.status = params[0];
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
  let c: string,
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
      //@ts-ignore
      keys.push("wild");
      pattern += "/(.*)";
    } else if (c === ":") {
      o = tmp.indexOf("?", 1);
      ext = tmp.indexOf(".", 1);
      //@ts-ignore
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
  static kv: Deno.Kv;
  static kvFs: DenoKvFs;
  static setKv(kv: Deno.Kv) {
    Server.kv = kv;
    Server.kvFs = new DenoKvFs(Server.kv);
  }
  #ac = new AbortController();
  // NOTE: This is transpiled into the constructor, therefore equivalent to this.routes = [];
  #routes: Route[] = [];
  //@ts-ignore
  server: Deno.HttpServer;
  openedSockets: Map<any, any> = new Map();

  // NOTE: Using .bind can significantly increase perf compared to arrow functions.
  public all: Function = this.#add.bind(this, "ALL");
  public get: Function = this.#add.bind(this, "GET");
  public head: Function = this.#add.bind(this, "HEAD");
  public patch: Function = this.#add.bind(this, "PATCH");
  public options: Function = this.#add.bind(this, "OPTIONS");
  public connect: Function = this.#add.bind(this, "CONNECT");
  public delete: Function = this.#add.bind(this, "DELETE");
  public trace: Function = this.#add.bind(this, "TRACE");
  public post: Function = this.#add.bind(this, "POST");
  public put: Function = this.#add.bind(this, "PUT");

  public resetRoutes() {
    this.#routes = [];
  }

  acceptOrRejectSocketConn = async (ctx: Context): Promise<any> => {
    return undefined;
  };
  onSocketMessage = async (
    id: string,
    socket: WebSocket,
    event: any,
  ): Promise<any> => {
  };
  onSocketClosed = async (id: string, socket: WebSocket): Promise<any> => {
  };

  public useAtBeginning(...handlers: RouteFn[]): Server {
    this.#routes.unshift({
      keys: [],
      method: "ALL",
      handlers,
    });
    return this;
  }

  public use(...handlers: RouteFn[]): Server {
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
      } catch (e: any) {
        ctx.error = e;
      }
    }
  }

  async serverHandler(
    request: Request,
    info: Deno.ServeHandlerInfo,
  ): Promise<Response> {
    try {
      const req = request;
      const url = new URL(request.url);
      const requestHandlers: RouteFn[] = [];
      const params: Params = {};
      const len = this.#routes.length;
      let hasRoute = false;
      for (let i = 0; i < len; i++) {
        const r = this.#routes[i];
        const keyLength = r.keys.length;
        let matches: null | string[] = null;
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
                let inc = 0;
                while (inc < keyLength) {
                  const prevInc = inc;
                  const m = matches[++inc];
                  if (m != undefined) {
                    params[r.keys[prevInc]] = decodeURIComponent(m);
                  }
                }
              }
            }
          }
          requestHandlers.push(...r.handlers);
        }
      }
      const ctx = new Context(
        info,
        params,
        url,
        req,
        hasRoute,
      );
      if (req.headers.get("upgrade") == "websocket") {
        const connectId = await this.acceptOrRejectSocketConn(ctx);
        if (!connectId) {
          ctx.res.status = 500;
          return new Response(ctx.res.body, {
            status: ctx.res.status,
          });
        }
        const { socket, response } = Deno.upgradeWebSocket(req);
        const existingSocket = this.openedSockets.get(connectId);
        if (existingSocket) {
          existingSocket.close();
        }
        this.openedSockets.set(connectId, socket);
        socket.onmessage = async (event) => {
          try {
            await this.onSocketMessage(connectId, socket, event);
          } catch (e) {
            console.log(e);
          }
        };
        socket.onclose = async () => {
          try {
            await this.onSocketClosed(connectId, socket);
          } catch (e) {
            console.log(e);
          }
          this.openedSockets.delete(connectId);
        };
        return response;
      }
      await this.#middlewareHandler(requestHandlers, 0, ctx);
      if (!ctx.error) {
        try {
          for (const p of ctx.postProcessors) {
            await p(ctx);
          }
        } catch (e: any) {
          ctx.error = e;
        }
      }
      if (ctx.res instanceof Response) {
        if (ctx.error) {
          console.log(ctx.error);
        }
        return ctx.res;
      }
      if (ctx.error) {
        ctx.res.status = 500;
        ctx.res.headers.set(
          "Content-Type",
          "application/json",
        );
        ctx.res.body = JSON.stringify({
          msg: (ctx.error.message || JSON.stringify(ctx.error)),
          stack: ctx.error.stack,
        });
      }
      return new Response(ctx.res.body, {
        headers: ctx.res.headers,
        status: ctx.res.status,
        statusText: ctx.res.statusText,
      });
    } catch (e) {
      console.log(e);
      return new Response();
    }
  }
  public async listen(options: any) { //save as Deno.Serve options
    if (this.server) {
      this.#ac.abort();
      await this.server.finished;
    }
    this.#ac = new AbortController();
    //@ts-ignore
    this.server = Deno.serve(
      { ...options, signal: this.#ac.signal },
      (request: Request, info: Deno.ServeHandlerInfo) =>
        this.serverHandler(request, info),
    );
  }
}
