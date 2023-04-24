/*
Created by: Henrique Emanoel Viana
Githu: https://github.com/hviana
Page: https://sites.google.com/view/henriqueviana
cel: +55 (41) 99999-4664
*/

import {
  copy,
  crypto,
  ensureFile,
  join,
  readerFromStreamReader,
} from "../deps.ts";
import { Context, NextFunc } from "../server.ts";
interface UploadOptions {
  path?: string;
  extensions?: Array<string>;
  maxSizeBytes?: number;
  maxFileSizeBytes?: number;
  saveFile?: boolean;
  readFile?: boolean;
  useCurrentDir?: boolean;
}

const defaultUploadOptions: UploadOptions = {
  path: "uploads",
  extensions: [],
  maxSizeBytes: Number.MAX_SAFE_INTEGER,
  maxFileSizeBytes: Number.MAX_SAFE_INTEGER,
  saveFile: true,
  readFile: false,
  useCurrentDir: true,
};

export function upload(
  options: UploadOptions = defaultUploadOptions,
) {
  const mergedOptions = { ...defaultUploadOptions, ...options };
  const {
    path,
    extensions,
    maxSizeBytes,
    maxFileSizeBytes,
    saveFile,
    readFile,
    useCurrentDir,
  } = mergedOptions;
  return async (ctx: Context, next: NextFunc) => {
    if (
      parseInt(ctx.req.headers.get("content-length")!) > maxSizeBytes!
    ) {
      throw new Error(
        `Maximum total upload size exceeded, size: ${
          ctx.req.headers.get("content-length")
        } bytes, maximum: ${maxSizeBytes} bytes. `,
      );
    }
    const boundaryRegex = /^multipart\/form-data;\sboundary=(?<boundary>.*)$/;
    let match: RegExpMatchArray | null;
    if (
      ctx.req.headers.get("content-type") &&
      (match = ctx.req.headers.get("content-type")!.match(
        boundaryRegex,
      ))
    ) {
      // const formBoundary: string = match.groups!.boundary;
      const reqBody = await ctx.req.formData();
      const res: any = {};
      let validations = "";
      for (const item of reqBody.entries()) {
        if (item[1] instanceof File) {
          if (extensions!.length > 0) {
            const ext = item[1].name.split(".").pop();
            if (!extensions!.includes(ext)) {
              validations += `The file extension is not allowed (${ext} in ${
                item[1].name
              }), allowed extensions: ${extensions}. `;
            }
          }
          if (item[1].size > maxFileSizeBytes!) {
            validations += `Maximum file upload size exceeded, file: ${
              item[1].name
            }, size: ${
              item[1].size
            } bytes, maximum: ${maxFileSizeBytes} bytes. `;
          }
        }
        if (validations != "") {
          throw new Error(validations);
        }
      }
      for (const item of reqBody.entries()) {
        if (item[1] instanceof File) {
          const formField: any = item[0];
          const fileData: any = item[1];
          const resData: any = {
            name: fileData.name,
            size: fileData.size,
          };
          const d = new Date();
          var filePath = join(
            d.getFullYear().toString(),
            (d.getMonth() + 1).toString(),
            d.getDate().toString(),
            d.getHours().toString(),
            d.getMinutes().toString(),
            d.getSeconds().toString(),
            crypto.randomUUID(),
            fileData.name,
          );
          if (path) {
            filePath = join(path!, filePath);
          }
          if (useCurrentDir) {
            resData["uri"] = join(Deno.cwd(), filePath);
          } else {
            resData["uri"] = filePath;
          }
          await ensureFile(resData["uri"]);
          resData["url"] = encodeURI(
            filePath.replace(/\\/g, "/"),
          );
          await copy(
            readerFromStreamReader(fileData.stream().getReader()),
            await Deno.open(resData["uri"], { create: true, write: true }),
          );
          if (readFile) {
            resData["data"] = await Deno.readFile(resData["uri"]);
          }
          if (!saveFile) {
            await Deno.remove(resData["uri"]);
            delete resData["url"];
            delete resData["uri"];
          }
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
    } else {
      throw new Error(
        'Invalid upload data, request must contains a body with form "multipart/form-data", and inputs with type="file". ',
      );
    }
    await next();
  };
}
