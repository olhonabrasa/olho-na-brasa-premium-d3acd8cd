// Auditoria da aba "Monte o seu": print de cada passo ativo, nada sobre o 3D além das cotas,
// Comprar nunca coberto, cartão de passo inteiro entre o palco e a barra, contraste (axe-core),
// CLS ao carregar a aba e a cota acompanhando a régua. Roda nas 3 viewports, com e sem movimento
// (projetos "*-movimento").
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const PASSOS = ["medidas", "churrasqueira", "kit", "acessorios", "resumo"];

test.beforeEach(({ page }, info) =>
  page.emulateMedia({
    reducedMotion: info.project.metadata?.movimento ? "no-preference" : "reduce",
  }),
);

async function abrir(page: Page, url = "/") {
  await page.goto(url);
  await page.waitForSelector("#onb-kit-lp.onb-pronto");
  await page.evaluate(() => document.fonts.ready);
}

const rolarAte = (page: Page, sel: string) =>
  page.evaluate((s) => {
    const r = document.querySelector(s)!.getBoundingClientRect();
    scrollTo(0, scrollY + r.top + r.height / 2 - innerHeight / 2);
  }, sel);

test("print de cada passo ativo, sem nada sobre o 3D e com o Comprar livre", async ({
  page,
}, info) => {
  await abrir(page);
  for (const id of PASSOS) {
    const sel = `#onb-passo-${id}`;
    if (id === "resumo" && !info.project.use.isMobile) continue; // preso no topo, não rola
    await rolarAte(page, sel);
    await expect(page.locator(sel)).toHaveClass(/\bativo\b/);
    await page.waitForTimeout(250);
    await info.attach(`passo-${id}`, { body: await page.screenshot(), contentType: "image/png" });
    const estado = await page.evaluate(() => {
      const ok = (el: Element) =>
        el.matches(
          "canvas, .onb-fallback, .onb-fallback *, .onb-cotas, .onb-cotas *, .onb-carregando, .onb-carregando *",
        );
      const visivel = (el: Element) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none";
      };
      const intrusos = [...document.querySelectorAll(".onb-stage *")]
        .filter((el) => !ok(el) && visivel(el))
        .map((el) => el.tagName.toLowerCase() + "." + [...el.classList].join("."));
      // o Comprar visível (do dock no celular, do resumo preso no desktop) recebe o toque?
      const comprar = [...document.querySelectorAll<HTMLElement>(".onb-comprar")].find(visivel);
      let comprarLivre: boolean | null = null;
      if (comprar) {
        const r = comprar.getBoundingClientRect();
        const dentro = r.top >= 0 && r.bottom <= innerHeight;
        comprarLivre = !dentro
          ? null
          : !!document.elementFromPoint(r.right - 8, r.top + r.height / 2)?.closest(".onb-comprar");
      }
      return { intrusos, comprarLivre };
    });
    expect(estado.intrusos, `${id}: elementos sobre o 3D`).toEqual([]);
    if (estado.comprarLivre !== null)
      expect(estado.comprarLivre, `${id}: Comprar coberto`).toBe(true);
  }
});

test("celular e tablet: o título de cada passo cabe entre o palco e a barra de preço", async ({
  page,
}, info) => {
  test.skip(!info.project.use.isMobile, "no desktop o palco e o painel são colunas");
  await abrir(page);
  for (const id of PASSOS) {
    // título no topo da viewport e depois 12px abaixo do palco preso
    await page.evaluate((s) => {
      document.querySelector(`#onb-passo-${s} .onb-passo-t`)!.scrollIntoView({ block: "start" });
      scrollBy(0, -(document.querySelector(".onb-palco")!.getBoundingClientRect().height + 12));
    }, id);
    await page.waitForTimeout(250);
    const r = await page.evaluate((s) => {
      const palco = document.querySelector(".onb-palco")!.getBoundingClientRect();
      const dock = document.querySelector(".onb-dock")!.getBoundingClientRect();
      const t = document.querySelector(`#onb-passo-${s} .onb-passo-t`)!.getBoundingClientRect();
      const dockOn = document.querySelector(".onb-dock")!.classList.contains("on");
      return {
        palcoBottom: palco.bottom,
        dockTop: dockOn ? dock.top : innerHeight,
        top: t.top,
        bottom: t.bottom,
      };
    }, id);
    expect(r.top, `${id}: título sob o palco`).toBeGreaterThanOrEqual(r.palcoBottom - 1);
    expect(r.bottom, `${id}: título sob a barra`).toBeLessThanOrEqual(r.dockTop + 1);
  }
});

test("contraste mínimo 4,5:1 no montador (axe-core)", async ({ page }, info) => {
  await abrir(page);
  // no passo 2: sem linha do kit esmaecida (estado transitório de leitura, a 0,35 de propósito)
  await rolarAte(page, "#onb-passo-churrasqueira");
  await page
    .locator('.onb-acc-btn[data-acc-toggle="cesto"]')
    .evaluate((b) => (b as HTMLElement).click());
  await page.waitForTimeout(300);
  const resultado = await new AxeBuilder({ page })
    .include("#onb-montador")
    // as cotas são decorativas (aria-hidden) e repetem a letra e o valor da régua
    .exclude(".onb-cotas")
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  const contraste = resultado.violations.filter((v) => v.id === "color-contrast");
  const outras = resultado.violations.filter((v) => v.id !== "color-contrast");
  if (outras.length)
    await info.attach("axe-outras-violacoes.json", {
      body: JSON.stringify(
        outras.map((v) => ({ id: v.id, impacto: v.impact, nos: v.nodes.length })),
        null,
        2,
      ),
      contentType: "application/json",
    });
  expect(
    contraste.flatMap((v) => v.nodes.map((n) => n.html.slice(0, 120))),
    "texto com contraste abaixo de 4,5:1",
  ).toEqual([]);
});

test("CLS abaixo de 0,1 ao carregar a aba", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __cls: number }).__cls = 0;
    new PerformanceObserver((lista) => {
      for (const e of lista.getEntries() as (PerformanceEntry & {
        hadRecentInput: boolean;
        value: number;
      })[])
        if (!e.hadRecentInput) (window as unknown as { __cls: number }).__cls += e.value;
    }).observe({ type: "layout-shift", buffered: true });
  });
  await abrir(page);
  await rolarAte(page, "#onb-passo-medidas");
  await page.waitForSelector("#onb-montador canvas, #onb-montador svg", { timeout: 60_000 });
  await page.waitForTimeout(1500);
  const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
  expect(cls).toBeLessThan(0.1);
});

test("trocar A atualiza a cota e o resumo juntos", async ({ page }) => {
  await abrir(page);
  await rolarAte(page, "#onb-passo-medidas");
  await expect(page.locator(".onb-cotas")).toHaveClass(/\bon\b/);
  await page.locator('input[name="a"]').fill("84");
  await page.locator('input[name="a"]').dispatchEvent("change");
  await expect(page.locator('.onb-cota[data-cota="a"] em')).toHaveText("84 cm");
  await expect(page.locator(".onb-palco-legenda")).toContainText("84 × 60 cm");
  await expect(page.locator(".onb-resumo .onb-resumo-linhas")).toContainText("Kit Premium 80×60");
});

test("desktop: a barra do produto encosta no topo e o palco e o resumo ficam abaixo dela", async ({
  page,
}, info) => {
  test.skip(!!info.project.use.isMobile, "a barra do produto só existe no desktop");
  await abrir(page);
  await rolarAte(page, "#onb-passo-churrasqueira");
  const barra = page.locator(".onb-barra-produto.on .onb-barra-dentro");
  await expect(barra).toBeVisible();
  await page.waitForTimeout(450); // fim da entrada da barra
  const m = await page.evaluate(() => {
    const b = document.querySelector(".onb-barra-dentro")!.getBoundingClientRect();
    const palco = document.querySelector(".onb-palco")!.getBoundingClientRect();
    const resumo = document.querySelector(".onb-resumo")!.getBoundingClientRect();
    return { barraTop: b.top, barraBottom: b.bottom, palcoTop: palco.top, resumoTop: resumo.top };
  });
  // a página da Wbuy define --onb-topo pela altura do cabeçalho da loja (90px), que a LP esconde
  expect(m.barraTop, "barra fora do topo da janela").toBe(0);
  // com "reduzir movimento" o palco e o resumo não ficam presos: rolam com a página
  if (info.project.metadata?.movimento) {
    expect(m.palcoTop, "palco atrás da barra").toBeGreaterThanOrEqual(m.barraBottom);
    expect(m.resumoTop, "resumo atrás da barra").toBeGreaterThanOrEqual(m.barraBottom);
  }
});

test("topo: o pôster é o primeiro quadro e, sem WebGL, o 3D não aparece nem deixa botão solto", async ({
  page,
}) => {
  await abrir(page);
  const m = await page.evaluate(() => {
    const midia = document.querySelector(".onb-hero-midia")!;
    const poster = midia.querySelector<HTMLImageElement>(".onb-hero-poster")!;
    const canvas = midia.querySelector<HTMLCanvasElement>(".onb-hero-canvas")!;
    return {
      posterCarregado: poster.complete && poster.naturalWidth > 0,
      posterOpaco: getComputedStyle(poster).opacity,
      canvasOpaco: getComputedStyle(canvas).opacity,
      sem3d: midia.classList.contains("sem-3d"),
      com3d: midia.classList.contains("com-3d"),
      replayEscondido: midia.querySelector<HTMLElement>(".onb-hero-replay")!.hidden,
      video: !!midia.querySelector("video"),
    };
  });
  expect(m.posterCarregado, "pôster do topo não carregou").toBe(true);
  expect(m.posterOpaco).toBe("1");
  // os testes rodam sem WebGL: o topo fica no pôster, sem canvas visível nem "ver de novo"
  expect(m.sem3d).toBe(true);
  expect(m.com3d).toBe(false);
  expect(m.canvasOpaco).toBe("0");
  expect(m.replayEscondido).toBe(true);
  expect(m.video, "ainda há <video> no topo").toBe(false);
});
