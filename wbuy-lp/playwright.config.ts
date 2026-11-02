import { defineConfig, devices } from "@playwright/test";

// Regressão visual da LP "Monte seu kit" contra a página de teste (modo simulado).
// Usa o Chrome instalado na máquina (channel "chrome"): nada para baixar.
// Capturas de referência: `npx playwright test --config wbuy-lp/playwright.config.ts --update-snapshots`.
export default defineConfig({
  testDir: "./tests",
  outputDir: "../.playwright/saida",
  snapshotPathTemplate: "{testDir}/capturas/{projectName}/{arg}{ext}",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 300_000,
  expect: {
    timeout: 30_000,
    toHaveScreenshot: { maxDiffPixelRatio: 0.001, animations: "disabled", caret: "hide" },
  },
  reporter: [["list"], ["html", { outputFolder: "../.playwright/relatorio", open: "never" }]],
  use: {
    baseURL: "http://localhost:5181",
    channel: "chrome",
    headless: true,
    // sem WebGL a LP usa o desenho SVG de reserva: a comparação é de DOM e CSS, e o canvas
    // (renderizado por software no headless) seria lento e nunca igual entre duas rodadas
    launchOptions: { args: ["--disable-webgl", "--disable-webgl2", "--disable-gpu"] },
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    colorScheme: "light",
    reducedMotion: "reduce",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "celular",
      use: { ...devices["iPhone 13"], channel: "chrome", defaultBrowserType: "chromium" },
    },
    {
      name: "tablet",
      use: {
        viewport: { width: 768, height: 1024 },
        deviceScaleFactor: 1,
        isMobile: true,
        hasTouch: true,
      },
    },
    { name: "desktop", use: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 } },
  ],
  webServer: {
    command:
      "node node_modules/vite/bin/vite.js --config wbuy-lp/vite.config.ts --port 5181 --strictPort",
    cwd: "..",
    url: "http://localhost:5181",
    reuseExistingServer: true,
    timeout: 240_000,
  },
});
