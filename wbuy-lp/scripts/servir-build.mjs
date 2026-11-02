// Serve o build da LP para o Lighthouse: wbuy-lp/lh/index.html na raiz e public/ (kit-builder.js,
// chunk do palco, img/, 3d/) nos seus caminhos, com gzip, como o Cloudflare Pages entrega.
// Uso: node wbuy-lp/scripts/servir-build.mjs [porta=5182]
import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { createGzip } from "node:zlib";

const RAIZ = new URL("../../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const PORTA = Number(process.argv[2]) || 5182;
const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".hdr": "application/octet-stream",
  ".json": "application/json",
};
const COMPRIMIR = new Set([".html", ".js", ".css", ".svg", ".json"]);

createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://x");
  const caminho = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
  const arquivo =
    caminho === "/" || caminho === "\\"
      ? join(RAIZ, "wbuy-lp/lh/index.html")
      : join(RAIZ, "public", caminho);
  if (!existsSync(arquivo) || !statSync(arquivo).isFile()) {
    res.writeHead(404).end();
    return;
  }
  const ext = extname(arquivo).toLowerCase();
  const cabecalhos = {
    "Content-Type": TIPOS[ext] ?? "application/octet-stream",
    "Cache-Control": ext === ".html" ? "no-store" : "public, max-age=300",
  };
  const gzip = COMPRIMIR.has(ext) && /\bgzip\b/.test(req.headers["accept-encoding"] ?? "");
  if (gzip) cabecalhos["Content-Encoding"] = "gzip";
  res.writeHead(200, cabecalhos);
  const fluxo = createReadStream(arquivo);
  if (gzip) fluxo.pipe(createGzip()).pipe(res);
  else fluxo.pipe(res);
}).listen(PORTA, () => console.log(`build da LP pronto em http://localhost:${PORTA}/`));
