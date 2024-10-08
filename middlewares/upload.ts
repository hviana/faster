/*
Created by: Henrique Emanoel Viana
Githu: https://github.com/hviana
Page: https://sites.google.com/view/henriqueviana
cel: +55 (41) 99999-4664
*/

import { Context, NextFunc, Server } from "../server.ts";
import { DenoKvFs } from "../deps.ts";

interface UploadOptions {
  allowedExtensions?: (ctx: Context) => Promise<Array<string>> | Array<string>;
  maxSizeBytes?: (ctx: Context) => Promise<number> | number;
  maxFileSizeBytes?: (ctx: Context) => Promise<number> | number;
  chunksPerSecond?: (ctx: Context) => Promise<number> | number;
  maxClientIdConcurrentReqs?: (ctx: Context) => Promise<number> | number;
  clientId?: (
    ctx: Context,
  ) => Promise<string | number | undefined> | string | number | undefined;
  validateAccess?: (ctx: Context, path: string[]) => Promise<boolean> | boolean;
}
interface DownloadOptions {
  chunksPerSecond?: (ctx: Context) => Promise<number> | number;
  clientId?: (
    ctx: Context,
  ) => Promise<string | number | undefined> | string | number | undefined;
  validateAccess?: (ctx: Context, path: string[]) => Promise<boolean> | boolean;
  maxClientIdConcurrentReqs?: (ctx: Context) => Promise<number> | number;
  maxDirEntriesPerSecond?: (ctx: Context) => Promise<number> | number;
  pagination?: (ctx: Context) => Promise<boolean> | boolean;
  cursor?: (ctx: Context) => Promise<string | undefined> | string | undefined; //for readDir, If there is a next page.
}
const defaultUploadOptions: UploadOptions = {
  allowedExtensions: (ctx: Context) => [],
  maxSizeBytes: (ctx: Context) => Number.MAX_SAFE_INTEGER,
  maxFileSizeBytes: (ctx: Context) => Number.MAX_SAFE_INTEGER,
  chunksPerSecond: (ctx: Context) => Number.MAX_SAFE_INTEGER,
  maxClientIdConcurrentReqs: (ctx: Context) => Number.MAX_SAFE_INTEGER,
  clientId: (ctx: Context) => undefined,
  validateAccess: (ctx: Context, path: string[]) => true,
};
const defaultDownloadOptions: DownloadOptions = {
  chunksPerSecond: (ctx: Context) => Number.MAX_SAFE_INTEGER,
  clientId: (ctx: Context) => undefined,
  validateAccess: (ctx: Context, path: string[]) => true,
  maxClientIdConcurrentReqs: (ctx: Context) => Number.MAX_SAFE_INTEGER,
  maxDirEntriesPerSecond: (ctx: Context) => Number.MAX_SAFE_INTEGER,
  pagination: (ctx: Context) => false,
  cursor: (ctx: Context) => undefined,
};

function upload(
  options: UploadOptions = defaultUploadOptions,
) {
  const mergedOptions = { ...defaultUploadOptions, ...options };
  const {
    allowedExtensions,
    maxSizeBytes,
    maxFileSizeBytes,
    chunksPerSecond,
    maxClientIdConcurrentReqs,
    clientId,
    validateAccess,
  } = mergedOptions;
  return async (ctx: Context, next: NextFunc) => {
    const reqBody = await ctx.req.formData();
    const existingFileNamesInTheUpload: { [key: string]: number } = {};
    const res: any = {};
    if (
      parseInt(ctx.req.headers.get("content-length")!) >
        await maxSizeBytes!(ctx)
    ) {
      throw new Error(
        `Maximum total upload size exceeded, size: ${
          ctx.req.headers.get("content-length")
        } bytes, maximum: ${await maxSizeBytes!(ctx)} bytes. `,
      );
    }
    for (const item of reqBody.entries()) {
      if (item[1] instanceof File) {
        const formField: any = item[0];
        const fileData: any = item[1];
        if (!existingFileNamesInTheUpload[fileData.name]) {
          existingFileNamesInTheUpload[fileData.name] = 1;
        } else {
          existingFileNamesInTheUpload[fileData.name]++;
        }
        let prepend = "";
        if (existingFileNamesInTheUpload[fileData.name] > 1) {
          prepend += existingFileNamesInTheUpload[fileData.name].toString();
        }
        var sep = "";
        if (!ctx.params.wild.endsWith("/")) {
          sep = "/";
        }
        const path = Server.kvFs!.URIComponentToPath(
          ctx.params.wild + sep + prepend + fileData.name,
        );
        let resData = await Server.kvFs!.save({
          path: path,
          content: fileData.stream(),
          allowedExtensions: await allowedExtensions!(ctx),
          maxFileSizeBytes: await maxFileSizeBytes!(ctx),
          chunksPerSecond: await chunksPerSecond!(ctx),
          maxClientIdConcurrentReqs: await maxClientIdConcurrentReqs!(ctx),
          clientId: await clientId!(ctx),
          validateAccess: async (path: string[]) =>
            await validateAccess!(ctx, path),
        });
        if (res[formField] !== undefined) {
          if (Array.isArray(res[formField])) {
            res[formField].push(resData);
          } else {
            res[formField] = [res[formField], resData];
          }
        } else {
          res[formField] = resData;
        }
      }
    }
    ctx.extra.uploadedFiles = res;
    await next();
  };
}

function download(
  options: DownloadOptions = defaultDownloadOptions,
) {
  const mergedOptions = { ...defaultDownloadOptions, ...options };
  const {
    chunksPerSecond,
    clientId,
    validateAccess,
    maxClientIdConcurrentReqs,
    maxDirEntriesPerSecond,
    pagination,
    cursor,
  } = mergedOptions;
  return async (ctx: Context, next: NextFunc) => {
    const path = Server.kvFs!.URIComponentToPath(ctx.params.wild);
    const file = await Server.kvFs!.read({
      path: path,
      chunksPerSecond: await chunksPerSecond!(ctx),
      clientId: await clientId!(ctx),
      validateAccess: async (path: string[]) =>
        await validateAccess!(ctx, path),
      maxClientIdConcurrentReqs: await maxClientIdConcurrentReqs!(ctx),
      maxDirEntriesPerSecond: await maxDirEntriesPerSecond!(ctx),
      pagination: await pagination!(ctx),
      cursor: await cursor!(ctx),
    });
    if (file) {
      ctx.res.body = (file as any).content;
      await next();
    } else {
      ctx.res.status = 404;
    }
  };
}

export { download, upload };
