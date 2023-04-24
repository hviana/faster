/*
Created by: Henrique Emanoel Viana
Githu: https://github.com/hviana
Page: https://sites.google.com/view/henriqueviana
cel: +55 (41) 99999-4664
*/

import { Context, NextFunc } from "../server.ts";

interface RateLimitOptions {
  attempts?: number;
  interval?: number;
  maxTableSize?: number;
  id?: (context: Context) => Promise<string> | string;
}

const defaultRateLimitOptions: RateLimitOptions = {
  attempts: 30,
  interval: 10,
  maxTableSize: 100000, //be careful, table uses a lot of memory
  id: (ctx: Context) => JSON.stringify(ctx.conn.remoteAddr),
};

function clearMap(
  idTable: Map<string, { time: number; attempts: number }>,
  maxTableSize: number,
  intervalMS: number,
) {
  if (idTable.size > maxTableSize) {
    const currentTime = Date.now();
    for (const [key, value] of idTable) {
      if (currentTime - value.time > intervalMS) {
        idTable.delete(key);
      }
    }
  }
}
export function rateLimit(
  options: RateLimitOptions = defaultRateLimitOptions,
) {
  const mergedOptions = { ...defaultRateLimitOptions, ...options };
  const {
    attempts,
    interval,
    maxTableSize,
  } = mergedOptions;
  const idTable: Map<string, { time: number; attempts: number }> = new Map();
  const intervalMS = interval! * 1000; //seconds to ms
  return async (ctx: Context, next: NextFunc) => {
    try {
      const id = await mergedOptions.id!(ctx);
      const data = idTable.get(id);
      if (!data) {
        idTable.set(id, { time: Date.now(), attempts: 1 });
        clearMap(idTable, maxTableSize!, intervalMS);
      } else {
        if (data.attempts > attempts!) {
          if (Date.now() - data.time > intervalMS) {
            idTable.delete(id);
          } else {
            throw new Error("API rate limit.");
          }
        }
        data.attempts++;
      }
      await next();
    } catch (e) {
      ctx.res.headers.set("Content-Type", "application/json");
      ctx.res.status = 429;
      ctx.res.body = JSON.stringify({
        msg: (e.message || e),
      });
    }
  };
}
