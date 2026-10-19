// Build da LP de campanha da Wbuy: um módulo ES (kit-builder.js) + o pedaço do
// three.js carregado sob demanda. Sai em public/wbuy-lp/, servido por
// premium.olhonabrasa.com.br/wbuy-lp/ junto com os HDRIs de public/3d/.
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const raiz = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: raiz,
  publicDir: fileURLToPath(new URL("../public", import.meta.url)),
  resolve: { alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) } },
  server: { port: 5181 },
  build: {
    outDir: fileURLToPath(new URL("../public/wbuy-lp", import.meta.url)),
    emptyOutDir: true,
    copyPublicDir: false,
    target: "es2020",
    modulePreload: false,
    chunkSizeWarningLimit: 700, // three.js, baixado só quando o montador aparece
    rollupOptions: {
      input: fileURLToPath(new URL("./src/main.ts", import.meta.url)),
      preserveEntrySignatures: "allow-extension",
      output: { entryFileNames: "kit-builder.js", chunkFileNames: "[name]-[hash].js" },
    },
  },
});
