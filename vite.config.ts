// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Hospedagem: Cloudflare Pages como site estático (build `bun run build`, saída `.output/public`).
// O preset cloudflare-module é necessário só para o prerender funcionar.
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
    prerender: { enabled: true, crawlLinks: false },
  },
  nitro: { preset: "cloudflare-module" },
});
