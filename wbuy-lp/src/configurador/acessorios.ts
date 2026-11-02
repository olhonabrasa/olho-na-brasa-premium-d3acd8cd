// Passo dos acessórios: giratório, cesto de miúdos, bandeja de coração e defumador.
import { ACESSORIOS, COMBO_GIRATORIO_CESTO } from "../catalog";
import type { AccId } from "../conteudo";
import { preco } from "../wbuy";
import { brl } from "../util";
import type { Ctx } from "./estado";

export function montarAcessorios(ctx: Ctx) {
  const { root, $, s } = ctx;

  function render() {
    const combo = s.acc.giratorio && s.acc.cesto;
    root.querySelectorAll<HTMLButtonElement>("[data-acc-toggle]").forEach((b) => {
      const id = b.dataset.accToggle as AccId;
      const on = s.acc[id];
      b.setAttribute("aria-pressed", String(on));
      const rot = b.querySelector(".onb-acc-acao");
      if (rot)
        rot.textContent = on
          ? "No seu kit ✓"
          : b.classList.contains("onb-acc")
            ? "Adicionar"
            : "Adicionar ao kit";
    });
    root.querySelectorAll<HTMLButtonElement>("[data-combo]").forEach((b) => {
      b.setAttribute("aria-pressed", String(combo));
      b.querySelector(".onb-acc-acao")!.textContent = combo
        ? "Combo no seu kit ✓"
        : "Adicionar o combo";
    });
    const nota = $(".onb-combo-nota");
    nota.hidden = !combo;
    if (combo) atualizarNotaCombo();
  }

  async function atualizarNotaCombo() {
    const [g, c, k] = await Promise.all([
      preco(ACESSORIOS.giratorio.sku),
      preco(ACESSORIOS.cesto.sku),
      preco(COMBO_GIRATORIO_CESTO),
    ]);
    if (!g || !c || !k) return;
    const economia = g.valor + c.valor - k.valor;
    $(".onb-combo-nota").innerHTML =
      economia > 0
        ? `Giratório + cesto entram como combo: <b>${brl(k.valor)}</b>, ${brl(economia)} a menos que separados.`
        : `Giratório + cesto entram como combo: <b>${brl(k.valor)}</b>.`;
  }

  function alternar(id: AccId, on?: boolean) {
    s.acc[id] = on ?? !s.acc[id];
    ctx.acoes.desenhar();
  }

  function alternarCombo() {
    const on = !(s.acc.giratorio && s.acc.cesto);
    s.acc.giratorio = on;
    s.acc.cesto = on;
    ctx.acoes.desenhar();
  }

  // preço de cada acessório e do combo nos cartões (uma consulta cada, guardada na visita)
  (Object.keys(ACESSORIOS) as AccId[]).forEach((id) =>
    preco(ACESSORIOS[id].sku).then((p) => {
      if (!p) return;
      root
        .querySelectorAll(`[data-preco-acc="${id}"]`)
        .forEach((el) => (el.textContent = brl(p.valor)));
    }),
  );
  preco(COMBO_GIRATORIO_CESTO).then((p) => {
    if (p)
      root.querySelectorAll("[data-preco-combo]").forEach((el) => (el.textContent = brl(p.valor)));
  });

  function aoChange(t: HTMLInputElement) {
    if (!t.dataset.accCheck) return false;
    alternar(t.dataset.accCheck as AccId, t.checked);
    return true;
  }

  function aoClique(b: HTMLButtonElement) {
    if (b.dataset.accToggle) alternar(b.dataset.accToggle as AccId);
    else if (b.hasAttribute("data-combo")) alternarCombo();
    else return false;
    return true;
  }

  return { render, alternar, aoChange, aoClique };
}
