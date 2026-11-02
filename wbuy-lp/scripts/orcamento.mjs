// Orçamento de peso da LP Wbuy. Falha (exit 1) se algum limite estourar.
//   bundle do configurador (kit-builder + chunk do palco, gzip) ≤ 350 KB
//   cada textura que o palco baixa (arquivos de public/3d citados em wbuy-lp/src) ≤ 600 KB
// Uso: node wbuy-lp/scripts/orcamento.mjs
import { readdirSync, readFileSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

const RAIZ = new URL("../../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const LIMITES = { bundleGzipKB: 350, texturaKB: 600 };
const kb = (n) => Math.round((n / 1024) * 10) / 10;

const pastaJs = join(RAIZ, "public/wbuy-lp");
const js = readdirSync(pastaJs).filter((f) => f.endsWith(".js"));
const gzipTotal = js.reduce((s, f) => s + gzipSync(readFileSync(join(pastaJs, f))).length, 0);

// só o que a LP Wbuy pede: a LP Premium tem os seus próprios mapas em public/3d
const fontes = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? fontes(join(dir, e.name)) : e.name.endsWith(".ts") ? [join(dir, e.name)] : [],
  );
const citadas = new Set();
for (const f of fontes(join(RAIZ, "wbuy-lp/src")))
  for (const m of readFileSync(f, "utf8").matchAll(/3d\/([\w.-]+\.(?:hdr|ktx2|png|jpg|webp))/g))
    citadas.add(m[1]);
const texturas = [...citadas]
  .map((f) => ({ f, kb: kb(statSync(join(RAIZ, "public/3d", f)).size) }))
  .sort((a, b) => b.kb - a.kb);

const linhas = [
  `bundle (${js.join(" + ")}): ${kb(gzipTotal)} KB gzip (limite ${LIMITES.bundleGzipKB} KB)`,
  ...texturas.map((t) => `textura ${t.f}: ${t.kb} KB (limite ${LIMITES.texturaKB} KB por arquivo)`),
];
const falhas = [];
if (kb(gzipTotal) > LIMITES.bundleGzipKB) falhas.push("bundle acima do limite");
for (const t of texturas)
  if (t.kb > LIMITES.texturaKB) falhas.push(`textura ${t.f} acima do limite`);

console.log(linhas.join("\n"));
if (falhas.length) {
  console.error("\nORÇAMENTO ESTOURADO: " + falhas.join("; "));
  process.exit(1);
}
console.log("\norçamento ok");
