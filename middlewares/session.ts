/*
Created by: Henrique Emanoel Viana
Githu: https://github.com/hviana
Page: https://sites.google.com/view/henriqueviana
cel: +55 (41) 99999-4664
*/

import { Context, NextFunc, Params, ProcessorFunc } from "../server.ts";
import {
  crypto,
  deleteCookie,
  getCookies,
  setCookie,
  storage,
} from "../deps.ts";

export type Session = {
  key: string;
  value: Params;
};

export class SessionStorageEngine {
  slidingExpiration: number = 0;
  absoluteExpiration: number = 0;
  onDeletedByExpiration: ((data: any) => void | Promise<void>) | undefined =
    undefined;
  initialized: boolean = false;
  constructor(
    slidingExpiration: number = 0,
    absoluteExpiration: number = 0,
    onDeletedByExpiration: ((data: any) => void | Promise<void>) | undefined =
      undefined,
  ) {
    if (absoluteExpiration > 0 && slidingExpiration > 0) {
      if (absoluteExpiration < slidingExpiration) {
        throw new Error(
          "Absolute Expiration cannot be less than Sliding Expiration.",
        );
      }
    }
    this.onDeletedByExpiration = onDeletedByExpiration;
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

export class SQLiteStorageEngine extends SessionStorageEngine {
  constructor(
    slidingExpiration: number = 60,
    absoluteExpiration: number = 0,
    onDeletedByExpiration: ((data: any) => void | Promise<void>) | undefined =
      undefined,
  ) {
    super(slidingExpiration, absoluteExpiration, onDeletedByExpiration);
  }
  async init(): Promise<void> {
    await storage.setCacheConfigs(
      this.slidingExpiration * 60 * 1000,
      this.absoluteExpiration * 60 * 1000,
      this.onDeletedByExpiration,
    );
    this.initialized = true;
  }
  async set(session: Session): Promise<void> {
    return await storage.set(`faster_sessions.${session.key}`, session);
  }
  async get(key: string): Promise<Session> {
    return await storage.get(`faster_sessions.${key}`);
  }
}

export function session(
  engine: SessionStorageEngine = new SQLiteStorageEngine(60),
) {
  return async (ctx: Context, next: NextFunc) => {
    if (!engine.initialized) {
      await engine.init();
    }
    var key = getCookies(ctx.req.headers).faster_session_id;
    ctx.extra.session = {};
    var hasSession = false;
    if (key) {
      const session_data = await engine.get(key);
      if (session_data) {
        hasSession = true;
        ctx.extra.session = session_data.value;
      }
    }
    ctx.postProcessors.add(async (ctx: Context) => {
      if ((Object.keys(ctx.extra.session).length > 0) || hasSession) {
        if (!key) {
          key = crypto.randomUUID();
          setCookie(ctx.res.headers, { name: "faster_session_id", value: key });
        }
        await engine.set({
          key: key,
          value: ctx.extra.session,
        });
      } else {
        if (key) {
          deleteCookie(ctx.res.headers, "faster_session_id");
        }
      }
    });

    await next();
  };
}
