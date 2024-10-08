/*
Created by: Henrique Emanoel Viana
Githu: https://github.com/hviana
Page: https://sites.google.com/view/henriqueviana
cel: +55 (41) 99999-4664
*/

import { Context, NextFunc, Server } from "../server.ts";
import { DenoKvFs } from "../deps.ts";

export class FasterLog {
  static async write(data: string) {
    const date = Date.now();
    const id = crypto.randomUUID();
    await Server.kv!.set(["faster", "log", date, id], data);
  }
  static async get(
    startMillis: number = 0,
    endMillis: number = Date.now(),
  ): Promise<any[]> {
    const res: any[] = [];
    const listParamsSaving = [{
      start: ["faster", "log", startMillis],
      end: ["faster", "log", endMillis],
    }, {
      limit: 1000,
    }];
    for await (
      const f of DenoKvFs.pagedListIterator(listParamsSaving, Server.kv!)
    ) {
      res.push({ time: f.key[f.key.length - 2], log: f.value });
    }
    return res;
  }
  static async delete(
    startMillis: number = 0,
    endMillis: number = Date.now(),
  ): Promise<void> {
    const listParamsSaving = [{
      start: ["faster", "log", startMillis],
      end: ["faster", "log", endMillis],
    }, {
      limit: 1000,
    }];
    for await (
      const f of DenoKvFs.pagedListIterator(listParamsSaving, Server.kv!)
    ) {
      await Server.kv!.delete(f.key);
    }
  }
}

export function logger(salve: boolean = true, print: boolean = true) {
  return async function (ctx: Context, next: NextFunc) {
    const entry = `${ctx.req.method} ${ctx.url.toString()} ${
      JSON.stringify(ctx.info.remoteAddr)
    } ${new Date().toISOString()}`;
    if (print) {
      console.log(entry);
    }
    if (salve) {
      await FasterLog.write(
        entry,
      );
    }
    await next();
  };
}
