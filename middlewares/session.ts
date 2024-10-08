/*
Created by: Henrique Emanoel Viana
Githu: https://github.com/hviana
Page: https://sites.google.com/view/henriqueviana
cel: +55 (41) 99999-4664
*/

import { Context, NextFunc, Server } from "../server.ts";
import { crypto, deleteCookie, getCookies, setCookie } from "../deps.ts";

export type Session = {
  key: string;
  value: any;
  created?: number;
};

export class SessionStorageEngine {
  slidingExpiration: number = 0;
  absoluteExpiration: number = 0;
  initialized: boolean = false;
  constructor(
    slidingExpiration: number = 0,
    absoluteExpiration: number = 0,
  ) {
    if (absoluteExpiration > 0 && slidingExpiration > 0) {
      if (absoluteExpiration < slidingExpiration) {
        throw new Error(
          "Absolute Expiration cannot be less than Sliding Expiration.",
        );
      }
    }
    this.slidingExpiration = slidingExpiration;
    this.absoluteExpiration = absoluteExpiration;
  }
  async init(): Promise<void> {
    throw new Error(`"init" not implemented in: ${this.constructor.name}`);
  }
  async set(session: Session): Promise<void> {
    throw new Error(`"set" not implemented in: ${this.constructor.name}`);
  }
  async get(key: string): Promise<Session> {
    throw new Error(`"get" not implemented in: ${this.constructor.name}`);
  }
}

export class KVStorageEngine extends SessionStorageEngine {
  constructor(
    slidingExpiration: number = 60,
    absoluteExpiration: number = 0,
  ) {
    super(slidingExpiration, absoluteExpiration);
  }
  override async init() {
  }
  override async set(session: Session): Promise<void> {
    const key = ["faster_sessions", session.key];
    var newEntry = false;
    if (session.created == undefined) {
      session.created = Date.now();
      newEntry = true;
    } else {
      if (this.slidingExpiration > 0 && this.absoluteExpiration > 0) {
        if (
          ((Date.now() - session.created) / 1000 / 60) >=
            this.absoluteExpiration
        ) {
          await Server.kv.delete(key);
        }
      }
    }
    if (this.slidingExpiration > 0) {
      await Server.kv.set(key, session, {
        expireIn: this.slidingExpiration * 1000 * 60,
      });
    } else if (this.absoluteExpiration > 0 && newEntry) {
      await Server.kv.set(key, session, {
        expireIn: this.absoluteExpiration * 1000 * 60,
      });
    } else {
      await Server.kv.set(key, session);
    }
  }
  override async get(key: string): Promise<Session> {
    const session: Session = (await Server.kv.get(["faster_sessions", key]))
      .value as Session;
    if (this.slidingExpiration > 0) {
      if (session) {
        await this.set(session);
      }
    }
    return session;
  }
}

export function session(
  engine: SessionStorageEngine = new KVStorageEngine(60),
) {
  return async (ctx: Context, next: NextFunc) => {
    if (!engine.initialized) {
      await engine.init();
    }
    var key = getCookies(ctx.req.headers).faster_session_id;
    ctx.extra.session = { value: {} };
    var hasSession = false;
    if (key) {
      const session_data = await engine.get(key);
      if (session_data) {
        hasSession = true;
        ctx.extra.session = session_data;
      }
    }
    ctx.postProcessors.add(async (ctx: Context) => {
      if ((Object.keys(ctx.extra.session.value).length > 0) || hasSession) {
        if (!key) {
          key = crypto.randomUUID();
          setCookie(ctx.res.headers, { name: "faster_session_id", value: key });
        }
        ctx.extra.session["key"] = key;
        await engine.set(ctx.extra.session);
      } else {
        if (key) {
          deleteCookie(ctx.res.headers, "faster_session_id");
        }
      }
    });

    await next();
  };
}
