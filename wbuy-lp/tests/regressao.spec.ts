// Regressão visual e de conteúdo da LP. As capturas de referência ficam em tests/capturas/<projeto>/.
// Refatoração sem mudança visual = este arquivo passa sem atualizar nenhuma captura.
import { expect, test, type Page } from "@playwright/test";

// o que não é determinístico de um load para outro: vídeos e o carrossel que roda sozinho
// (o 3D não entra: o navegador de teste roda sem WebGL e a LP mostra o desenho SVG de reserva)
const MASCARAS = ["canvas", "video", ".onb-hero-midia", ".onb-destaques"];

async function abrir(page: Page, url = "/") {
  await page.goto(url);
  await page.waitForSelector("#onb-kit-lp.onb-pronto");
  await page.evaluate(() => document.fonts.ready);
  // passa pela página toda para disparar lazy-load e observers, e volta ao topo
  await page.evaluate(async () => {
    const passo = Math.round(innerHeight * 0.8);
    for (let y = 0; y < document.documentElement.scrollHeight; y += passo) {
      scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    scrollTo(0, 0);
  });
  await page.waitForTimeout(400);
}

const mascaras = (page: Page) => MASCARAS.map((sel) => page.locator(sel));

// a opção `reducedMotion` do contexto não chega à página com o canal "chrome"; emular por página garante
test.beforeEach(({ page }) => page.emulateMedia({ reducedMotion: "reduce" }));

/** Foto do montador: página inteira recortada na caixa dele (captura de elemento mais alto que a
 *  viewport não estabiliza na emulação de celular) + o texto, para pegar mudança de conteúdo. */
async function conferirMontador(page: Page, nome: string) {
  const montador = page.locator("#onb-montador");
  await montador.scrollIntoViewIfNeeded();
  await page.waitForSelector("#onb-montador canvas, #onb-montador svg", { timeout: 60_000 });
  await page.waitForTimeout(800);
  await page.evaluate(() => scrollTo(0, 0));
  const caixa = (await montador.boundingBox())!;
  await expect(page).toHaveScreenshot(`${nome}.png`, {
    fullPage: true,
    clip: {
      x: 0,
      y: Math.floor(caixa.y),
      width: Math.ceil(caixa.width),
      height: Math.ceil(caixa.height),
    },
    mask: mascaras(page),
  });
  expect(await montador.innerText()).toMatchSnapshot(`${nome}.txt`);
}

test("página inteira", async ({ page }) => {
  await abrir(page);
  await expect(page).toHaveScreenshot("pagina-inteira.png", {
    fullPage: true,
    mask: mascaras(page),
  });
});

test("montador: estado inicial (70×60)", async ({ page }) => {
  await abrir(page);
  await conferirMontador(page, "montador-inicial");
});

test("montador: deep link ?a=80&b=70", async ({ page }) => {
  await abrir(page, "/?a=80&b=70");
  await conferirMontador(page, "montador-80x70");
});

test("montador: modo peças", async ({ page }) => {
  await abrir(page, "/?modo=pecas");
  await conferirMontador(page, "montador-pecas");
});

test("console sem erros", async ({ page }) => {
  const erros: string[] = [];
  page.on("pageerror", (e) => erros.push(e.message));
  page.on("console", (m) => m.type() === "error" && erros.push(m.text()));
  await abrir(page);
  await page.locator("#onb-montador").scrollIntoViewIfNeeded();
  await page.waitForTimeout(3000);
  expect(erros).toEqual([]);
});

// ---------- item 3: palco preso, cotas só no passo das medidas, nada mais sobre o 3D ----------

const rolarAte = (page: Page, sel: string) =>
  page.evaluate((s) => {
    const r = document.querySelector(s)!.getBoundingClientRect();
    scrollTo(0, scrollY + r.top + r.height / 2 - innerHeight / 2);
  }, sel);

test("sobre o 3D não há botão, tarja, chip nem dica", async ({ page }) => {
  await abrir(page);
  await rolarAte(page, "#onb-passo-medidas");
  await page.waitForTimeout(600);
  const intrusos = await page.evaluate(() => {
    const ok = (el: Element) =>
      el.matches(
        "canvas, .onb-fallback, .onb-fallback *, .onb-cotas, .onb-cotas *, .onb-carregando, .onb-carregando *",
      );
    return [...document.querySelectorAll(".onb-stage *")]
      .filter((el) => !ok(el))
      .filter((el) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none";
      })
      .map((el) => el.tagName.toLowerCase() + "." + [...el.classList].join("."));
  });
  expect(intrusos).toEqual([]);
});

test("cotas só no passo das medidas e legenda do palco", async ({ page }) => {
  await abrir(page);
  const cotas = page.locator(".onb-cotas");
  const legenda = page.locator(".onb-palco-legenda");
  await rolarAte(page, ".onb-painel .onb-passo:first-child");
  await expect(legenda).toHaveText(/^70 × 60 cm · .+ · passo 1 de 5$/);
  await expect(cotas).not.toHaveClass(/\bon\b/);
  await rolarAte(page, "#onb-passo-medidas");
  await expect(legenda).toHaveText(/· passo 3 de 5$/);
  await expect(cotas).toHaveClass(/\bon\b/);
  await rolarAte(page, ".onb-resumo");
  await expect(legenda).toHaveText(/· resumo$/);
  await expect(cotas).not.toHaveClass(/\bon\b/);
});

/** Posição do palco com o passo 3 no meio da tela e depois com o resumo (medido num só evaluate). */
const palcoAoRolar = (page: Page) =>
  page.evaluate(() => {
    const palco = document.querySelector(".onb-palco")!;
    const rola = (sel: string) => {
      const r = document.querySelector(sel)!.getBoundingClientRect();
      scrollTo(0, scrollY + r.top + r.height / 2 - innerHeight / 2);
    };
    rola("#onb-passo-medidas");
    const y1 = palco.getBoundingClientRect().y;
    rola(".onb-resumo");
    const y2 = palco.getBoundingClientRect().y;
    return { position: getComputedStyle(palco).position, y1, y2 };
  });

test.describe("palco preso", () => {
  test("o palco fica parado enquanto os passos rolam", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await abrir(page);
    const p = await palcoAoRolar(page);
    expect(p.position).toBe("sticky");
    expect(Math.abs(p.y1 - p.y2)).toBeLessThan(2);
    expect(p.y2).toBeGreaterThanOrEqual(0);
  });
});

test.describe("menos movimento", () => {
  test("o palco rola com a página", async ({ page }) => {
    await abrir(page);
    const p = await palcoAoRolar(page);
    expect(p.position).toBe("static");
    expect(p.y1 - p.y2).toBeGreaterThan(100);
  });
});
