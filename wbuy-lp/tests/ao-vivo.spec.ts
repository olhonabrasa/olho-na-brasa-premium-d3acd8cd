// Contra a loja real. Só roda com LP_AO_VIVO=1 (e precisa de internet).
//   LP_AO_VIVO=1 npx playwright test --config wbuy-lp/playwright.config.ts ao-vivo --project desktop
// Com LP_PRODUTO_URL=<página do Kit Premium 70×60 na loja>, compara o preço da LP com o do produto.
import { expect, test } from "@playwright/test";

const LP = "https://www.olhonabrasa.com.br/m/monte-seu-kit/";
test.skip(!process.env.LP_AO_VIVO, "defina LP_AO_VIVO=1 para rodar contra a loja");

test("na loja: sem modo simulado e o mesmo preço no resumo, na barra e na página do produto", async ({
  page,
}) => {
  await page.goto(`${LP}?a=70&b=60`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#onb-kit-lp.onb-pronto", { timeout: 60_000 });
  await expect(page.locator(".onb-simulado")).toHaveCount(0);
  const total = page.locator(".onb-resumo .onb-total .v");
  await expect(total).toHaveText(/^R\$\s[\d.]+,\d{2}$/, { timeout: 30_000 });
  const preco = (await total.textContent())!.trim();
  await expect(page.locator(".onb-barra-preco").first()).toHaveText(preco);
  await expect(page.locator(".onb-resumo .onb-resumo-linhas")).toContainText("Kit Premium 70×60");
  if (process.env.LP_PRODUTO_URL) {
    const html = await (await page.request.get(process.env.LP_PRODUTO_URL)).text();
    const v = html.match(/produto_valor\s*=\s*parseFloat\('([\d.]+)'\)/);
    expect(v, "produto_valor na página do produto").not.toBeNull();
    const daLoja = Number(v![1]).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    expect(preco.replace(/\s/g, " ")).toBe(daLoja.replace(/\s/g, " "));
  }
});
