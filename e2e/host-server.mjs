// A tiny web server for the fake host page (e2e/host/index.html), on a second origin, like the
// Squarespace site. Usage: node e2e/host-server.mjs <port> [app origin]
// The page names http://localhost:3100; another app origin replaces it.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const port = Number(process.argv[2] ?? 4100);
const app = process.argv[3] ?? "http://localhost:3100";
const page = fileURLToPath(new URL("./host/index.html", import.meta.url));

createServer(async (request, response) => {
  const path = new URL(request.url ?? "/", "http://localhost").pathname;
  if (path !== "/") {
    response.writeHead(404).end("Not found");
    return;
  }
  response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  response.end((await readFile(page, "utf8")).replaceAll("http://localhost:3100", app));
}).listen(port, () => console.log(`Embed test host on http://localhost:${port}`));
