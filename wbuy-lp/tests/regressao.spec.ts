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
