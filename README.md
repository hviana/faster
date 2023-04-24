# Faster

A fast and optimized middleware server with an absurdly small amount of code
(300 lines) built on top of Deno's native HTTP APIs with no dependencies. It
also has a collection of useful middlewares: log file, serve static, CORS,
session, rate limit, token, body parsers, redirect, proxy and handle upload. In
"README" there are examples of all the resources. Faster's ideology is: all you
need is an optimized middleware manager, all other functionality is middleware.

## Contents

- [Benchmarks](#benchmarks)

- [Example](#example)
  - [Defining routes](#defining-routes)
  - [POST read and return JSON](#post-read-and-return-json)
  - [GET return HTML](#get-return-html)
  - [Get URL params](#get-url-params)
  - [Cookies](#cookies)
  - [Redirect](#redirect)
- [Middleares](#middleares)
  - [Logger](#logger)
  - [Body Parsers res and req](#body-Parsers-res-and-req)
  - [Rate Limit](#rate-limit)
  - [Serve Static](#serve-static)
  - [Set Cors](#set-cors)
  - [Token](#token)
  - [Redirect](#redirect)
  - [Session](#session)
  - [Proxy](#proxy)
  - [Upload](#upload)
    - [Upload usage](#upload-usage)
    - [Upload examples in frontend and backend](#upload-examples-in-frontend-and-backend)
- [All imports](#all-imports)
- [Example Deploy](#example-deploy)
  - [Create service](#create-service)
  - [Configure HTTPS](#configure-https)
- [About](#about)

## Benchmarks

The middleware is built on top of Deno's native HTTP APIs, see the benchmarks
('hello word' server):

**Machine**: 8 GiB, Intel® Core™ i5-10210U CPU @ 2.11GHz × 4

**method**: `autocannon -c 100 -d 40 -p 10 localhost:80`. Deno v1.19.3, Ubuntu
20.04 LTS.

| Framework  | Version | Router? |                                   Results |
| ---------- | :-----: | :-----: | ----------------------------------------: |
| Express    | 4.17.3  |    ✓    |       167k requests in 40.11s, 29 MB read |
| Fastify    | 3.27.4  |    ✓    |     1105k requests in 40.07s ,193 MB read |
| Oak        | 10.4.0  |    ✓    |       260k requests in 40.09s, 45 MB read |
| **Faster** | **5.7** |  **✓**  | **1432k requests in 40.17s, 250 MB read** |

Note that in addition to performance, Faster is a very complete framework
considering its middleware collection.

## Example

### Defining routes

Static (/foo, /foo/bar)

Parameter (/:title, /books/:title, /books/:genre/:title)

Parameter w/ Suffix (/movies/:title.mp4, /movies/:title.(mp4|mov))

Optional Parameters (/:title?, /books/:title?, /books/:genre/:title?)

Wildcards (\*, /books/\*, /books/:genre/\*)

### POST read and return JSON

```typescript
import { req, res, Server } from "https://deno.land/x/faster/mod.ts";
const server = new Server();
server.post(
  "/example_json",
  res("json"),
  req("json"),
  async (ctx: any, next: any) => {
    console.log(ctx.body);
    ctx.res.body = { msg: "json response example" };
    await next();
  },
);
await server.listen({ port: 80 });
```

### GET return HTML

```typescript
server.get(
  "/example_html",
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
```

### Get URL params

```typescript
server.get(
  "/example_params/:ex1?foo=bar",
  async (ctx: any, next: any) => {
    console.log(ctx.params.ex1);
    console.log(ctx.url.searchParams.get("foo")); //you can explore the URL (ctx.url) object
    await next();
  },
);
```

### Cookies

```typescript
import {
  Cookie,
  deleteCookie,
  getCookies,
  getSetCookies,
  Server,
  setCookie,
} from "https://deno.land/x/faster/mod.ts"; //alias to deno std
server.get(
  "/cookies",
  async (ctx: any, next: any) => {
    setCookie(ctx.res.headers, { name: "user_name", value: "San" }); //explore interface 'Cookie' for more options
    deleteCookie(ctx.res.headers, "last_order");
    console.log(getCookies(ctx.req.headers));
    await next();
  },
);
```

### Redirect

```typescript
server.get(
  "/redirect_example",
  async (ctx: any, next: any) => {
    ctx.redirect("/my_custom_url_or_path");
    await next();
  },
);
```

## Middleares

This project has a standard set of middleware useful for most cases.

### Logger

Example:

```typescript
server.use(logger());
```

You can pass custom log file:

```typescript
logger("./my_dir/my_custom_log.txt");
```

### Body Parsers res and req

Example:

```typescript
server.post(
  "/example_parsers",
  res("json"), //Response parser
  req("json"), //Request parser
  async (ctx: any, next: any) => {
    console.log(ctx.body); //the original (no parser) body is in ctx.req.body
    ctx.res.body = { msg: "json response example" };
    await next();
  },
);
```

The current supported options for "req" are: "arrayBuffer", "blob", "formData",
"json", "text".

The current supported options for "res" are: "json", "html", "javascript".

If there are no parsers for your data, don't worry, you can handle the data
manually, Ex:

```typescript
server.post(
  "/upload",
  async (ctx: any, next: any) => {
    ctx.res.headers.set(
      "Content-Type",
      "application/json",
    );
    const data = await exCustomParseBody(ctx.req.body); //do what you want with ctx.req.body
    ctx.res.body = JSON.stringify({ msg: "ok" }); // //ctx.res.body can also be other data types such as streams, bytes and etc.
    await next();
  },
);
```

### Rate Limit

Example:

```typescript
server.use(rateLimit());
```

OPTIONS (with default values):

```typescript
rateLimit({
  attempts: 30,
  interval: 10,
  maxTableSize: 100000,
  id: (ctx: Context) => JSON.stringify(ctx.conn.remoteAddr),
});
```

### Serve Static

Example (must end with "/*"):

```typescript
server.get(
  "/pub/*",
  serveStatic("./pub"),
);
```

### Set Cors

Example:

```typescript
server.options("/example_cors", setCORS()); //enable pre-fligh request
server.get(
  "/example_cors",
  setCORS(),
  async (ctx, next) => {
    await next();
  },
);
```

You can pass valid hosts to cors function:

```typescript
setCORS("http://my.custom.url:8080");
```

### Token

This middleware is encapsulated in an entire static class. It uses Bearer Token
and default options with the "HS256" algorithm, and generates a random secret
when starting the application (you can also set a secret manually). Ex:

```typescript
server.get(
  "/example_verify_token", //send token to server in Header => Authorization: Bearer TOKEN
  Token.middleware,
  async (ctx, next) => {
    console.log(ctx.extra.tokenPayload);
    console.log(ctx.extra.token);
    await next();
  },
);
```

Generate Token ex:

```typescript
await Token.generate({ user_id: "172746" }, null); //null to never expire, this parameter defaults to "1h"
```

Set secret ex:

```typescript
Token.setSecret("a3d2r366wgb3dh6yrwzw99kzx2"); //Do this at the beginning of your application
```

Get token payload out of middleware:

```typescript
await Token.getPayload("YOUR_TOKEN_STRING"); //Ex: use for get token data from token string in URL parameter.
```

You can also use the static method `Token.setConfigs`.

### Redirect

Ex:

```typescript
server.get(
  "/my_url_1",
  redirect("/my_url_2"), //or the full url
);
```

### Session

#### Example

Ex:

```typescript
server.use(session());
//in routes:
server.get(
  "/session_example",
  async (ctx, next) => {
    console.log(ctx.extra.session); //get session data
    ctx.extra.session.foo = "bar"; //set session data
    await next();
  },
);
```

The default engine uses SQLite and is optimized. The engine does not use a fixed
periodic timer to check validity. The engine uses indexes and also does not loop
through the database.

#### Absolute Expiration

The object in the Cache will expire on a certain date, from the moment of
insertion of the object in the Cache, regardless of its use or not. The value
`0` disables this type of expiration.

#### Sliding Expiration

The object in Cache will expire after the configured time, from the last request
of the object in Cache (`get` or `set`). The value `0` disables this type of
expiration.

#### Interface

If `slidingExpiration` and `absoluteExpiration` are `0`, expiration is disabled.
if `absoluteExpiration` and `slidingExpiration` are greater than `0` (enabled),
`absoluteExpiration` cannot be less than `slidingExpiration`.

INTERFACE (SessionStorageEngine):

```
constructor(
  slidingExpiration: number = 0,
  absoluteExpiration: number = 0,
  onDeletedByExpiration: ((data: any) => void | Promise<void>) | undefined =
    undefined,
)
```

DEFAULT VALUES:

```
session(engine: SessionStorageEngine = new SQLiteStorageEngine()) //default is 60 min slidingExpiration
```

### Proxy

Ex:

```typescript
server.use(proxy({ url: "https://my-url-example.com" }));
```

In routes:

```typescript
server.get(
  "/proxy_example",
  async (ctx, next) => {
    console.log(ctx.req); //req has changed as it now points to the proxy
    console.log(ctx.res); //res has changed because now it has the proxy answer

    //OR if replaceReqAndRes = false
    console.log(ctx.extra.proxyReq);
    console.log(ctx.extra.proxyRes);

    await next();
  },
);
```

Or proxy in specific route:

```typescript
server.get(
  "/proxy_example",
  proxy({
    url: "https://my-url-example.com/proxy_ex2",
    replaceProxyPath: false, //specific proxy route for the route "/proxy_example"
  }),
  async (ctx, next) => {
    console.log(ctx.req); //req has changed as it now points to the proxy
    console.log(ctx.res); //res has changed because now it has the proxy answer
    await next();
  },
);
```

Conditional proxy:

```typescript
server.get(
  "/proxy_example",
  proxy({
    url: "https://my-url-example.com/proxy_ex3",
    condition: (ctx) => {
      if (ctx.url.searchParams.get("foo")) {
        return true;
      } else {
        return false;
      }
    },
  }),
  async (ctx, next) => {
    console.log(ctx.extra.proxied); //will be true if proxy condition is true
    console.log(ctx.req); //req has changed as it now points to the proxy
    console.log(ctx.res); //res has changed because now it has the proxy answer
    await next();
  },
);
```

OPTIONS (with default values):

```
proxy(url: string, replaceReqAndRes: true, replaceProxyPath: true, condition: : (ctx: Context) => true )
```

**Do not use "res body parsers" with 'replaceReqAndRes: true' (default) !!!**

**If you don't use Request body information before the proxy or in your
condition, don't use "req body parsers" as this will increase the processing
cost !!!**

### Upload

This middleware automatically organizes uploads to avoid file system problems
and create dirs if not exists, perform validations and optimizes ram usage when
uploading large files using Deno standard libraries!

#### Upload usage

Ex:

```typescript
.post("/upload", upload(), async (ctx: any, next: any) => { ...
```

Ex (with custom options):

```typescript
.post("/upload", upload({ path: 'uploads_custom_dir' , extensions: ['jpg', 'png'], maxSizeBytes: 20000000, maxFileSizeBytes: 10000000, saveFile: true, readFile: false, useCurrentDir: true }), async (ctx: any, next: any) => { ...
```

Request must contains a body with form type "multipart/form-data", and inputs
with type="file".

#### Upload examples in frontend and backend

Below an frontend example to work with <b>AJAX</b>, also accepting type="file"
<b>multiple</b>:

```javascript
var files = document.querySelector("#yourFormId input[type=file]").files;
var name = document.querySelector("#yourFormId input[type=file]").getAttribute(
  "name",
);

var form = new FormData();
for (var i = 0; i < files.length; i++) {
  form.append(`${name}_${i}`, files[i]);
}
var res = await fetch("/upload", { //Fetch API automatically puts the form in the format "multipart/form-data".
  method: "POST",
  body: form,
}).then((response) => response.json());
console.log(res);
```

In Deno (backend):

```typescript
import { res, Server, upload } from "https://deno.land/x/faster/mod.ts";
const server = new Server();
server.post(
  "/upload",
  res("json"),
  upload({
    path: "my_uploads",
    extensions: ["jpg", "png"],
    maxSizeBytes: 20000000,
    maxFileSizeBytes: 10000000,
  }),
  async (ctx: any, next: any) => {
    ctx.res.body = ctx.extra.uploadedFiles;
    await next();
  },
);
server.get("/", res("html"), async (ctx: any, next: any) => {
  ctx.res.body = `
  <form id="yourFormId" enctype="multipart/form-data" action="/upload" method="post">
    <input type="file" name="file1" multiple><br>
    <input type="submit" value="Submit">
  </form>
    `;
  await next();
});
await server.listen({ port: 80 });
```

## All imports

```typescript
import {
  Context,
  ContextResponse, //type
  Cookie, //type, alias to deno std
  deleteCookie, //alias to deno std
  getCookies, //alias to deno std
  getSetCookies, //alias to deno std
  logger,
  NextFunc, //type
  Params, //type
  parse,
  ProcessorFunc, //type
  proxy,
  rateLimit,
  redirect,
  req,
  res,
  Route, //type
  RouteFn, //type
  Server,
  serveStatic,
  Session, //type
  session,
  SessionStorageEngine,
  setCookie, //alias to deno std
  setCORS,
  SQLiteStorageEngine,
  Token,
  upload,
} from "https://deno.land/x/faster/mod.ts";
```

## Example Deploy

Example of depoly application "my-deno-app" in ubuntu environment. Change the
"my-deno-app" and the directories to yours.

### Create service

Create run script ("run-server.sh") in your application folder with the content:

```
#!/bin/bash
/home/ubuntu/.deno/bin/deno run --allow-net --allow-read --allow-write /home/ubuntu/my-deno-app/app.ts
```

Give permission to the script:

```console
chmod +x run-server.sh
```

Create service files:

```console
sudo touch /etc/systemd/system/my-deno-app.service
sudo nano /etc/systemd/system/my-deno-app.service
```

In "my-deno-app".service (change the "Description", "WorkingDirectory" and
"ExecStart" to yours):

```
[Unit]
Description=My Deno App

[Service]
WorkingDirectory=/home/ubuntu/my-deno-app
ExecStart=/home/ubuntu/my-deno-app/run-server.sh
TimeoutSec=30
Restart=always
RestartSec=1

[Install]
WantedBy=multi-user.target
```

If your application needs to wait for another service to start, such as the
mongodb database, you can use the ´[Unit]´ section like this:

```
[Unit]
Description=My Deno App
After=mongod.service
```

Enable the "my-deno-app" service:

```console
sudo systemctl enable my-deno-app.service
```

To start and stop the "my-deno-app" service:

```console
sudo service my-deno-app stop
sudo service my-deno-app start
```

See log:

```console
journalctl -u my-deno-app.service --since=today -e
```

### Configure HTTPS

Install certbot:

```console
sudo apt install certbot
```

Generate certificates (port 80 needs to be free):

```console
sudo certbot certonly --standalone
```

In step:

"Please enter the domain name(s) you would like on your certificate (comma
and/or space separated) (Enter 'c' to cancel):"

Insert domains and subdomains, example: `yourdomain.link www.yourdomain.link`

To run your application on https (Change "yourdomain.link" to your domain):

```typescript
await server.listen({
  port: 443,
  certFile: "/etc/letsencrypt/live/yourdomain.link/fullchain.pem",
  keyFile: "/etc/letsencrypt/live/yourdomain.link/privkey.pem",
});
```

The certificate is valid for a short period. Set crontab to update
automatically. The command 'sudo crontab' opens roots crontab, all commands are
executed as sudo. Do like this:

```console
sudo crontab -e
```

Add to the end of the file (to check and renew if necessary every 12 hours -
port 80 needs to be free):

```
0 */12 * * * certbot -q renew --standalone --preferred-challenges=http
```

Or also to check every 7 days (port 80 needs to be free):

```
0 0 * * 0 certbot -q renew --standalone --preferred-challenges=http
```

## About

Author: Henrique Emanoel Viana, a Brazilian computer scientist, enthusiast of
web technologies, cel: +55 (41) 99999-4664. URL:
https://sites.google.com/view/henriqueviana

Improvements and suggestions are welcome!
