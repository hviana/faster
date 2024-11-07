# 🚀 **Faster**

> [!IMPORTANT]\
> **Please give a star!** ⭐

---

## 🌟 Introduction

**Faster** is a **fast and optimized middleware server** with an incredibly
small codebase (~300 lines), built on top of Deno's native HTTP APIs **with no
dependencies**. It includes a collection of useful middlewares:

- 📄 **Log file**
- 🗂️ **Serve static**
- 🌐 **CORS**
- 🔐 **Session**
- ⏱️ **Rate limit**
- 🛡️ **Token**
- 📥 **Body parsers**
- 🔀 **Redirect**
- 🔌 **Proxy**
- 📤 **Handle upload**

Fully compatible with **Deno Deploy**. Examples of all resources are available
in this README. Faster's ideology is simple: all you need is an optimized
middleware manager; all other functionality is middleware.

---

## 📚 **Contents**

- [⚡ Benchmarks](#-benchmarks)
- [🚀 Example](#-example)
  - [🛣️ Defining Routes](#%EF%B8%8F-defining-routes)
  - [📨 POST: Read and Return JSON](#-post-read-and-return-json)
  - [🌐 GET: Return HTML](#-get-return-html)
  - [🔍 Get URL Params](#-get-url-params)
  - [🍪 Cookies](#-cookies)
  - [↩️ Redirect](#%EF%B8%8F-redirect)
  - [💬 WebSockets](#-websockets)
- [🛠️ Middlewares](#%EF%B8%8F-middlewares)
  - [📦 Set Deno KV and Deno KV FS](#-set-deno-kv-and-deno-kv-fs)
  - [📝 Logger](#-logger)
  - [📥 Body Parsers (`res` and `req`)](#-body-parsers-res-and-req)
  - [⏱️ Rate Limit](#%EF%B8%8F-rate-limit)
  - [🗂️ Serve Static](#%EF%B8%8F-serve-static)
  - [🌐 Set CORS](#-set-cors)
  - [🔑 Token](#-token)
  - [↩️ Redirect Middleware](#%EF%B8%8F-redirect-middleware)
  - [🔐 Session](#-session)
  - [🔌 Proxy](#-proxy)
  - [📤 Upload](#-upload)
    - [🚀 Upload Usage](#-upload-usage)
    - [💻 Upload Examples in Frontend and Backend](#-upload-examples-in-frontend-and-backend)
- [📁 Organizing Routes in Files](#-organizing-routes-in-files)
- [📦 All Imports](#-all-imports)
- [🌐 Example Deploy in Ubuntu](#-example-deploy-in-ubuntu)
  - [🛠️ Create Service](#%EF%B8%8F-create-service)
  - [🔒 Configure HTTPS](#-configure-https)
- [💡 See Also: Faster with React](#-see-also-faster-with-react)
- [👨‍💻 About](#-about)

---

## ⚡ **Benchmarks**

The middleware is built on top of Deno's native HTTP APIs. See the benchmarks
(for a 'Hello World' server):

**Machine**: 8 GiB RAM, Intel® Core™ i5-10210U CPU @ 2.11GHz × 4\
**Method**: `autocannon -c 100 -d 40 -p 10 localhost:80`\
**Environment**: Deno v1.46.3, Ubuntu 24.04 LTS

| Framework  | Version  | Router? | Results                                   |
| ---------- | :------: | :-----: | ----------------------------------------- |
| Express    |  4.19.2  |    ✓    | 167k requests in 40.11s, **29 MB** read   |
| Fastify    |  4.28.1  |    ✓    | 1105k requests in 40.07s, **193 MB** read |
| Oak        |  17.0.0  |    ✓    | 260k requests in 40.09s, **45 MB** read   |
| **Faster** | **11.6** |  **✓**  | **1432k requests in 40.17s, 250 MB read** |

> **Note:** In addition to its performance, Faster is a very complete framework
> considering its middleware collection.

---

## 🚀 **Example**

### 🛣️ **Defining Routes**

- **Static Routes**: `/foo`, `/foo/bar`
- **Parameterized Routes**:
  - Simple: `/:title`, `/books/:title`, `/books/:genre/:title`
  - With Suffix: `/movies/:title.mp4`, `/movies/:title.(mp4|mov)`
  - Optional Parameters: `/:title?`, `/books/:title?`, `/books/:genre/:title?`
- **Wildcards**: `*`, `/books/*`, `/books/:genre/*`

---

### 📨 **POST: Read and Return JSON**

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

//or with the portable command "serve":
export default {
  async fetch(_req: Request) {
    return await server.serveHandler(_req);
  },
};
```

---

### 🌐 **GET: Return HTML**

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
          <title>Title Example</title>
        </head>
        <body>
          HTML body example
        </body>
      </html>
    `;
    await next();
  },
);
```

---

### 🔍 **Get URL Params**

```typescript
server.get(
  "/example_params/:ex1?foo=bar",
  async (ctx: any, next: any) => {
    console.log(ctx.params.ex1);
    console.log(ctx.url.searchParams.get("foo")); // Explore the URL (ctx.url) object
    await next();
  },
);
```

---

### 🍪 **Cookies**

```typescript
import {
  Cookie,
  deleteCookie,
  getCookies,
  getSetCookies,
  Server,
  setCookie,
} from "https://deno.land/x/faster/mod.ts"; // Alias to Deno std

server.get(
  "/cookies",
  async (ctx: any, next: any) => {
    setCookie(ctx.res.headers, { name: "user_name", value: "San" }); // Explore interface 'Cookie' for more options
    deleteCookie(ctx.res.headers, "last_order");
    console.log(getCookies(ctx.req.headers));
    await next();
  },
);
```

---

### ↩️ **Redirect**

Use: `ctx.redirect([status,] "/my_custom_url_or_path")`. The default status is
`302`.

```typescript
server.get(
  "/redirect_example",
  async (ctx: any, next: any) => {
    ctx.redirect(303, "/my_custom_url_or_path");
    await next();
  },
);

server.get(
  "/redirect_example2",
  async (ctx: any, next: any) => {
    ctx.redirect("/my_custom_url_or_path");
    await next();
  },
);
```

---

### 💬 **WebSockets**

By default, the server will reject WebSocket connections to prevent
vulnerabilities. To accept connections, use the `acceptOrRejectSocketConn`
function, which should return an ID to retrieve the WebSocket later. If the
function returns `undefined`, `""`, `null`, `0`, etc., the connection will be
rejected.

**Example:**

```typescript
server.acceptOrRejectSocketConn = async (ctx: Context) => {
  // Returning undefined, "", null, or 0 will reject the connection.
  return ctx.req.headers.get("Host"); // Return ID
};
```

**Retrieving the Socket by ID:**

```typescript
server.openedSockets.get(yourId); // As in the example, ctx.req.headers.get("Host")
```

**Receiving WebSocket Events:**

```typescript
server.onSocketMessage = async (id: string, socket: WebSocket, event: any) => {
  console.log(id);
  console.log(socket);
  console.log(event);
};

server.onSocketClosed = async (id: string, socket: WebSocket) => {
  console.log(id);
  console.log(socket);
};
//... server.onSocketError, server.onSocketOpen
```

---

## 🛠️ **Middlewares**

This project has a standard set of middlewares useful for most cases.

### 📦 **Set Deno KV and Deno KV FS**

You need to launch Deno KV and Deno KV FS as several middlewares depend on it.

```typescript
const kv = await Deno.openKv(); // Use your parameters here to launch a custom Deno.Kv
Server.setKv(kv);
```

Now, you can globally access instances in `Server.kv` and `Server.kvFs`.

- **Deno KV File System (`Server.kvFs`):** Compatible with Deno Deploy. Saves
  files in 64KB chunks. You can organize files into directories, control the
  KB/s rate for saving and reading files, impose rate limits, set user space
  limits, and limit concurrent operations—useful for controlling
  uploads/downloads. Utilizes the Web Streams API.

See more at: [deno_kv_fs](https://github.com/hviana/deno_kv_fs)

---

### 📝 **Logger**

```typescript
logger(save: boolean = true, print: boolean = true)
```

**Initialize Deno KV (if not already done):**

```typescript
const kv = await Deno.openKv();
Server.setKv(kv);
```

**Usage:**

```typescript
// You can also use useAtBeginning
server.use(logger()); // With default options: save and print are true
```

**Access Log Data:**

- **Retrieve Logs:** `await FasterLog.get(startMillis, endMillis)`
- **Delete Logs:** `await FasterLog.delete(startMillis, endMillis)`

---

### 📥 **Body Parsers (`res` and `req`)**

**Example:**

```typescript
server.post(
  "/example_parsers",
  res("json"), // Response parser
  req("json"), // Request parser
  async (ctx: any, next: any) => {
    console.log(ctx.body); // The original (unparsed) body is in ctx.req.body
    ctx.res.body = { msg: "json response example" };
    await next();
  },
);
```

**Supported Options:**

- **`req` Parsers:** `"arrayBuffer"`, `"blob"`, `"formData"`, `"json"`, `"text"`
- **`res` Parsers:** `"json"`, `"html"`, `"javascript"`

**Custom Parsing Example:**

```typescript
server.post(
  "/custom_parse",
  async (ctx: any, next: any) => {
    ctx.res.headers.set("Content-Type", "application/json");
    const data = await customParseBody(ctx.req.body); // Handle ctx.req.body manually
    ctx.res.body = JSON.stringify({ msg: "ok" });
    await next();
  },
);
```

---

### ⏱️ **Rate Limit**

**Usage:**

```typescript
// You can also use useAtBeginning
server.use(rateLimit());
```

**Options (with default values):**

```typescript
rateLimit({
  attempts: 30,
  interval: 10,
  maxTableSize: 100000,
  id: (ctx: Context) => ctx.req.headers.get("Host"),
});
```

---

### 🗂️ **Serve Static**

**Example (route must end with `/*`):**

```typescript
server.get(
  "/pub/*",
  serveStatic("./pub"),
);
```

---

### 🌐 **Set CORS**

**Example:**

```typescript
server.options("/example_cors", setCORS()); // Enable pre-flight request

server.get(
  "/example_cors",
  setCORS(),
  async (ctx, next) => {
    await next();
  },
);
```

**Specify Allowed Hosts:**

```typescript
setCORS("http://my.custom.url:8080");
```

---

### 🔑 **Token**

This middleware is encapsulated in an entire static class. It uses Bearer Token
and default options with the "HS256" algorithm, generating a random secret when
starting the application (you can also set a secret manually).

**Usage:**

```typescript
server.get(
  "/example_verify_token", // Send token to server in Header => Authorization: Bearer TOKEN
  Token.middleware,
  async (ctx, next) => {
    console.log(ctx.extra.tokenPayload);
    console.log(ctx.extra.token);
    await next();
  },
);
```

**Generate Token:**

```typescript
await Token.generate({ user_id: "172746" }, null); // Null for never expire; defaults to "1h"
```

**Set Secret:**

```typescript
Token.setSecret("a3d2r366wgb3dh6yrwzw99kzx2"); // Do this at the beginning of your application
```

**Get Token Payload Outside Middleware:**

```typescript
await Token.getPayload("YOUR_TOKEN_STRING"); // For example, to get token data from token string in URL parameter
```

**Set Configurations:**

```typescript
Token.setConfigs(/* your configurations */);
```

---

### ↩️ **Redirect Middleware**

**Usage:** `redirect([status,] "/my_custom_url_or_path")`. The default status is
`302`.

**Example:**

```typescript
server.get(
  "/my_url_1",
  redirect(303, "/my_url_2"), // Or the full URL
);

server.get(
  "/my_url_2",
  redirect("/my_url_3"), // Or the full URL
);
```

---

### 🔐 **Session**

**Initialize Deno KV (if not already done):**

```typescript
const kv = await Deno.openKv();
Server.setKv(kv);
```

#### **Example**

```typescript
// You can also use useAtBeginning
server.use(session());

// In routes:
server.get(
  "/session_example",
  async (ctx, next) => {
    console.log(ctx.extra.session); // Get session data
    ctx.extra.session.value.foo = "bar"; // Set session data (foo => "bar")
    await next();
  },
);
```

- The default engine uses Deno KV and is optimized.

#### **Expiration Policies**

- **Absolute Expiration:** The object in the cache will expire after a certain
  time from when it was inserted, regardless of its usage. A value of `0`
  disables this expiration.
- **Sliding Expiration:** The object expires after a configured time from the
  last request (`get` or `set`). A value of `0` disables this expiration.

**Note:** If both `slidingExpiration` and `absoluteExpiration` are `0`,
expiration is disabled. If both are greater than `0`, `absoluteExpiration`
cannot be less than `slidingExpiration`.

**Session Storage Engine Interface:**

```typescript
constructor(
  slidingExpiration: number = 0,
  absoluteExpiration: number = 0
)
```

**Default Values:**

```typescript
session(engine: SessionStorageEngine = new KVStorageEngine()) // Default is 60 min slidingExpiration
```

---

### 🔌 **Proxy**

**Usage:**

```typescript
// You can also use useAtBeginning
server.use(proxy({ url: "https://my-url-example.com" }));
server.use(proxy({ url: async (ctx) => "https://my-url-example.com" }));
```

**In Routes:**

```typescript
server.get(
  "/proxy_example",
  async (ctx, next) => {
    console.log(ctx.req); // Request points to the proxy
    console.log(ctx.res); // Response contains the proxy answer
    await next();
  },
);
```

**Specific Proxy Route:**

```typescript
server.get(
  "/proxy_example",
  proxy({
    url: "https://my-url-example.com/proxy_ex2",
    replaceProxyPath: false, // Specific proxy route for "/proxy_example"
  }),
  async (ctx, next) => {
    console.log(ctx.req);
    console.log(ctx.res);
    await next();
  },
);
```

**Conditional Proxy:**

```typescript
server.get(
  "/proxy_example",
  proxy({
    url: "https://my-url-example.com/proxy_ex3",
    condition: (ctx) => {
      return ctx.url.searchParams.get("foo") ? true : false;
    },
  }),
  async (ctx, next) => {
    console.log(ctx.extra.proxied); // True if proxy condition is true
    console.log(ctx.req);
    console.log(ctx.res);
    await next();
  },
);
```

**Options (with default values):**

```typescript
proxy({
  url: string,
  replaceReqAndRes: true,
  replaceProxyPath: true,
  condition: (ctx: Context) => true,
});
```

> **Warning:** Do not use "res body parsers" with `replaceReqAndRes: true`
> (default)!\
> **Note:** If you don't use Request body information before the proxy or in
> your condition, avoid using "req body parsers" to reduce processing cost.

---

### 📤 **Upload**

**Initialize Deno KV (if not already done):**

```typescript
const kv = await Deno.openKv();
Server.setKv(kv);
```

This middleware uses Deno KV File System
([deno_kv_fs](https://github.com/hviana/deno_kv_fs)).

#### 🚀 **Upload Usage**

**Example:**

```typescript
// The route must end with *
server.post("/files/*", upload(), async (ctx: any, next: any) => {/* ... */});
server.get("/files/*", download(), async (ctx: any, next: any) => {/* ... */});
```

**With Custom Options:**

- **Download:**

```typescript
server.post(
  "/files/*",
  upload({
    allowedExtensions: async (ctx: Context) => ["jpg"],
    maxSizeBytes: async (ctx: Context) =>
      (ctx.extra.user.isPremium() ? 1 : 0.1) * 1024 * 1024 * 1024, // 1GB or 100MB
    maxFileSizeBytes: async (ctx: Context) =>
      (ctx.extra.user.isPremium() ? 1 : 0.1) * 1024 * 1024 * 1024, // 1GB or 100MB
    chunksPerSecond: async (ctx: Context) =>
      (ctx.extra.user.isPremium() ? 10 : 1) /
      kvFs.getClientReqs(ctx.extra.user.id),
    maxClientIdConcurrentReqs: async (
      ctx: Context,
    ) => (ctx.extra.user.isPremium() ? 10 : 1),
    clientId: async (ctx: Context) => ctx.extra.user.id,
    validateAccess: async (ctx: Context, path: string[]) =>
      ctx.extra.user.hasDirAccess(path),
  }),
  async (ctx: any, next: any) => {/* ... */},
);
```

- **Upload:**

```typescript
server.get(
  "/files/*",
  download({
    chunksPerSecond: async (ctx: Context) =>
      (ctx.extra.user.isPremium() ? 10 : 1) /
      kvFs.getClientReqs(ctx.extra.user.id),
    maxClientIdConcurrentReqs: async (
      ctx: Context,
    ) => (ctx.extra.user.isPremium() ? 10 : 1),
    clientId: async (ctx: Context) => ctx.extra.user.id,
    validateAccess: async (ctx: Context, path: string[]) =>
      ctx.extra.user.hasDirAccess(path),
    maxDirEntriesPerSecond: async (
      ctx: Context,
    ) => (ctx.extra.user.isPremium() ? 1000 : 100),
    pagination: async (ctx: Context) => true,
    cursor: async (ctx: Context) => ctx.url.searchParams.get("cursor"),
  }),
);
```

#### 💻 **Upload Examples in Frontend and Backend**

**Frontend (AJAX with multiple files):**

```javascript
const files = document.querySelector("#yourFormId input[type=file]").files;
const name = document.querySelector("#yourFormId input[type=file]")
  .getAttribute("name");

const form = new FormData();
for (let i = 0; i < files.length; i++) {
  form.append(`${name}_${i}`, files[i]);
}
const userId = 1; // Example
const res = await fetch(`/files/${userId}`, {
  method: "POST",
  body: form,
}).then((response) => response.json());

console.log(res);
```

**Backend (Deno):**

```typescript
import {
  download,
  res,
  Server,
  upload,
} from "https://deno.land/x/faster/mod.ts";

const server = new Server();

server.post(
  "/files/*", // For example: /files/general/myFile.xlsx
  res("json"),
  upload(), // Using default options. No controls.
  async (ctx: any, next: any) => {
    ctx.res.body = ctx.extra.uploadedFiles;
    await next();
  },
);

server.get(
  "/files/*",
  download(), // Using default options. No controls.
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

//or with the portable command "serve":
export default {
  async fetch(_req: Request) {
    return await server.serveHandler(_req);
  },
};
```

---

## 📁 **Organizing Routes in Files**

It's possible to organize routes into files using native JavaScript resources.

**Main File:**

```typescript
import { Server } from "https://deno.land/x/faster/mod.ts";
import exampleRoutes from "./example_routes.ts";

const server = new Server();
exampleRoutes("example", server);

await server.listen({ port: 80 });

//or with the portable command "serve":
export default {
  async fetch(_req: Request) {
    return await server.serveHandler(_req);
  },
};
```

**Secondary Route File (`example_routes.ts`):**

```typescript
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
            <title>Title Example</title>
          </head>
          <body>
            HTML body example
          </body>
        </html>
      `;
      await next();
    },
  );
}
```

---

## 📦 **All Imports**

```typescript
import {
  Context,
  ContextResponse, // Type
  Cookie, // Type, alias to Deno std
  deleteCookie, // Alias to Deno std
  download,
  FasterLog,
  getCookies, // Alias to Deno std
  getSetCookies, // Alias to Deno std
  KVStorageEngine,
  logger,
  NextFunc, // Type
  Params, // Type
  parse,
  ProcessorFunc, // Type
  proxy,
  rateLimit,
  redirect,
  req,
  res,
  Route, // Type
  RouteFn, // Type
  Server,
  serveStatic,
  Session, // Type
  session,
  SessionStorageEngine,
  setCookie, // Alias to Deno std
  setCORS,
  Token,
  upload,
} from "jsr:@hviana/faster";
import * as jose from "jsr:@hviana/faster/jose"; // jsr port of deno panva/jose (v5.9.6)
import * as deno_kv_fs from "jsr:@hviana/faster/deno-kv-fs"; // Alias to jsr @hviana/deno-kv-fs (v1.0.1)
```

---

## 🌐 **Example Deploy in Ubuntu**

Example of deploying an application named "my-deno-app" in a Ubuntu environment.
Change "my-deno-app" and directories to yours.

### 🛠️ **Create Service**

**Create Run Script ("run-server.sh") in Your Application Folder:**

```bash
#!/bin/bash
/home/ubuntu/.deno/bin/deno run --allow-all --unstable-kv /home/ubuntu/my-deno-app/app.ts
```

**Give Execution Permission to the Script:**

```bash
chmod +x run-server.sh
```

**Create Service Files:**

```bash
sudo touch /etc/systemd/system/my-deno-app.service
sudo nano /etc/systemd/system/my-deno-app.service
```

**In "my-deno-app.service" (change "Description", "WorkingDirectory", and
"ExecStart" to yours):**

```ini
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

**If Your Application Depends on Another Service (e.g., MongoDB):**

```ini
[Unit]
Description=My Deno App
After=mongod.service
```

**Enable the "my-deno-app" Service:**

```bash
sudo systemctl enable my-deno-app.service
```

**Start and Stop the "my-deno-app" Service:**

```bash
sudo service my-deno-app stop
sudo service my-deno-app start
```

**View Logs:**

```bash
journalctl -u my-deno-app.service --since=today -e
```

---

### 🔒 **Configure HTTPS**

**Install Certbot:**

```bash
sudo apt install certbot
```

**Generate Certificates (Port 80 Must Be Free):**

```bash
sudo certbot certonly --standalone
```

**During Setup:**

When prompted:

```
Please enter the domain name(s) you would like on your certificate (comma and/or space separated) (Enter 'c' to cancel):
```

Enter your domains and subdomains, e.g.: `yourdomain.link www.yourdomain.link`

**Run Your Application on HTTPS (Change "yourdomain.link" to Your Domain):**

```typescript
await server.listen({
  port: 443,
  cert: await Deno.readTextFile(
    "/etc/letsencrypt/live/yourdomain.link/fullchain.pem",
  ),
  key: await Deno.readTextFile(
    "/etc/letsencrypt/live/yourdomain.link/privkey.pem",
  ),
});

//or with the portable command "serve":
//in this case you need to pass arguments such as port and certificate in the command.
export default {
  async fetch(_req: Request) {
    return await server.serveHandler(_req);
  },
};
```

**Set Up Automatic Certificate Renewal:**

The certificate is valid for a short period. Set up a cron job to renew
automatically.

**Edit Root's Crontab:**

```bash
sudo crontab -e
```

**Add to the End of the File (to Check and Renew Every 12 Hours):**

```
0 */12 * * * certbot -q renew --standalone --preferred-challenges=http
```

**Alternatively, Check Every 7 Days:**

```
0 0 * * 0 certbot -q renew --standalone --preferred-challenges=http
```

---

## 💡 **See Also: Faster with React**

Check out the complete framework with Faster and React:

👉
[https://github.com/hviana/faster_react](https://github.com/hviana/faster_react)

---

## 👨‍💻 **About**

**Author:** Henrique Emanoel Viana, a Brazilian computer scientist and web
technology enthusiast.

- 📞 **Phone:** +55 (41) 99999-4664
- 🌐 **Website:**
  [https://sites.google.com/view/henriqueviana](https://sites.google.com/view/henriqueviana)

> **Improvements and suggestions are welcome!**

---
