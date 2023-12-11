import { Server } from "https://deno.land/x/faster/mod.ts";
import exampleRoutes from "./example_routes.ts";
const server = new Server();
exampleRoutes(server);
await server.listen({ port: 80 });
