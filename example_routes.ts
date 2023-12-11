import { req, res, Server } from "https://deno.land/x/faster/mod.ts";
export default function exampleRoutes(namespace: string, server: Server) {
  server.post(
    `${namespace}/json`,
    res("json"),
    req("json"),
    async (ctx: any, next: any) => {
      console.log(ctx.body);
      ctx.res.body = { msg: "json response example" };
      await next();
    },
  );
  server.get(
    `${namespace}/html`,
    res("html"),
    async (ctx: any, next: any) => {
      ctx.res.body = `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <title>title example</title>
              </head>
              </body>
                HTML body example
              <body>
            </html>
          `;
      await next();
    },
  );
}
