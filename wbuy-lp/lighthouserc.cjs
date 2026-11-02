// Lighthouse CI da LP Wbuy: o build de verdade (public/wbuy-lp, com gzip) numa página igual à da
// Wbuy, em modo simulado, celular. Uso: `npm run build:wbuy && npm run lh:wbuy`.
// Orçamento: CLS < 0,1; scripts ≤ 350 KB transferidos (kit-builder + chunk do palco, gzip);
// o three.js só entra quando o montador chega perto.
module.exports = {
  ci: {
    collect: {
      url: ["http://localhost:5182/"],
      startServerCommand: "node wbuy-lp/scripts/servir-build.mjs 5182",
      startServerReadyPattern: "pronto em",
      startServerReadyTimeout: 60000,
      numberOfRuns: 1,
      settings: {
        preset: "perf",
        formFactor: "mobile",
        screenEmulation: { mobile: true, width: 390, height: 844, deviceScaleFactor: 2 },
        // o palco em software é lento no headless; o que medimos é layout e peso, não FPS
        chromeFlags: "--disable-webgl --disable-webgl2 --disable-gpu",
        onlyCategories: ["performance", "accessibility", "best-practices"],
      },
    },
    assert: {
      assertions: {
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
        "resource-summary:script:size": ["error", { maxNumericValue: 358400 }],
        "categories:accessibility": ["warn", { minScore: 0.9 }],
        "categories:performance": ["warn", { minScore: 0.6 }],
      },
    },
    upload: { target: "temporary-public-storage" },
  },
};
