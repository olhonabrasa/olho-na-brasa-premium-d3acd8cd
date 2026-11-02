// Resumo: o que vai para o carrinho, o preço (linhas, total, Pix) e o botão Comprar.
// No desktop é o cartão preso no topo da coluna; no celular, o último passo e a barra fixa no pé.
import { faixaKit, pecasDaMontagem, skuKit } from "../builder";
import { ACESSORIOS, COMBO_GIRATORIO_CESTO, COOKTOP_SKU } from "../catalog";
import { ACC_INFO, type AccId } from "../conteudo";
import { adicionarAoCarrinho, irParaCarrinho, preco, type ItemCarrinho } from "../wbuy";
import { brl, esc } from "../util";
import type { Ctx } from "./estado";

type Item = ItemCarrinho & { nome: string };
const PRAZO_PADRAO = "até 10 dias úteis";

export function montarResumo(ctx: Ctx) {
  const { root, $, s } = ctx;
  const dock = $(".onb-dock");

  const comSuporte = () => (s.modo === "kit" ? !!faixaKit(s.a, s.b) : s.m.suporte.on);

  function itensCarrinho(): Item[] {
    const nota = `Medida da churrasqueira: ${s.a}x${s.b} cm · ${s.inst} · ${s.amb} (LP Monte seu kit)`;
    const base: Item[] = [];
    if (s.modo === "kit") {
      const f = faixaKit(s.a, s.b);
      if (f)
        base.push({
          sku: skuKit(f.a, f.b)!,
          qtd: 1,
          anotacao: nota,
          nome: `Kit Premium ${f.a}×${f.b}`,
        });
    } else {
      pecasDaMontagem(s.m).forEach((i, k) =>
        base.push({ sku: i.sku, qtd: i.peca.qtd, anotacao: k === 0 ? nota : "", nome: i.rotulo }),
      );
    }
    if (s.inst === "cooktop" && comSuporte())
      base.push({ sku: COOKTOP_SKU, qtd: 1, nome: "Encaixe cooktop" });
    const combo = s.acc.giratorio && s.acc.cesto;
    if (combo)
      base.push({ sku: COMBO_GIRATORIO_CESTO, qtd: 1, nome: "Giratório + cesto de miúdos" });
    (Object.keys(s.acc) as AccId[]).forEach((id) => {
      if (!s.acc[id] || (combo && (id === "giratorio" || id === "cesto"))) return;
      base.push({ sku: ACESSORIOS[id].sku, qtd: 1, nome: ACC_INFO[id].titulo });
    });
    return base;
  }

  const linhasEl = () => root.querySelectorAll("[data-resumo-linhas]");

  let geracao = 0;
  async function atualizarPreco() {
    const g = ++geracao;
    const itens = itensCarrinho();
    root
      .querySelectorAll<HTMLButtonElement>(".onb-comprar")
      .forEach((b) => (b.disabled = itens.length === 0));
    if (!itens.length) {
      const aviso =
        s.modo === "kit"
          ? `Medida fora das faixas do kit (50–99 × 40–74 cm). <button type="button" class="onb-link-inline" data-whats>Fale com a fábrica</button>: a gente faz sob medida.`
          : "Escolha ao menos uma peça.";
      linhasEl().forEach((el) => (el.innerHTML = `<li class="onb-resumo-aviso">${aviso}</li>`));
      return mostrarTotal(null, s.modo === "kit" ? "Sob consulta" : "—", null);
    }
    mostrarTotal(null, "Calculando…", null);
    const precos = await Promise.all(itens.map((i) => preco(i.sku)));
    if (g !== geracao) return;
    if (precos.some((p) => !p)) return mostrarTotal(null, "Preço indisponível agora", null);
    let total = 0;
    let pix = 0;
    const linhas = itens.map((item, i) => {
      const v = precos[i]!.valor * item.qtd;
      total += v;
      pix += (precos[i]!.pix ?? precos[i]!.valor) * item.qtd;
      const qtd = item.qtd > 1 ? `${item.qtd}× ` : "";
      return `<li><span>${qtd}${esc(item.nome)}</span><b>${brl(v)}</b></li>`;
    });
    linhasEl().forEach((el) => (el.innerHTML = linhas.join("")));
    const prazo = precos.find((p) => p!.prazo)?.prazo?.toLowerCase() ?? PRAZO_PADRAO;
    mostrarTotal({ valor: total, pix: pix < total ? pix : null }, null, prazo);
  }

  function mostrarTotal(
    p: { valor: number; pix: number | null } | null,
    msg: string | null,
    prazo: string | null,
  ) {
    const totalV = $(".onb-resumo .onb-total .v");
    const totalD = $(".onb-resumo .onb-total .d");
    totalV.textContent = p ? brl(p.valor) : msg;
    totalV.classList.toggle("onb-pulso", !p && msg === "Calculando…");
    totalD.textContent = p ? `${p.pix ? `${brl(p.pix)} no Pix · ` : ""}até 10x sem juros` : "";
    $(".onb-prazo").textContent = `Produção: ${prazo ?? PRAZO_PADRAO} + frete`;
    $(".onb-dock-preco .v").textContent = p ? brl(p.valor) : msg;
    $(".onb-dock-preco .d").textContent = p ? `até 10x · ${prazo ?? PRAZO_PADRAO}` : "";
    root
      .querySelectorAll(".onb-barra-preco")
      .forEach((el) => (el.textContent = p ? brl(p.valor) : ""));
  }

  /** Toque no preço da barra do celular abre e fecha o resumo. */
  function alternarDock(aberto = !dock.classList.contains("aberto")) {
    dock.classList.toggle("aberto", aberto);
    $(".onb-dock-preco").setAttribute("aria-expanded", String(aberto));
  }

  async function comprar(btn: HTMLButtonElement) {
    const itens = itensCarrinho();
    if (!itens.length) return;
    alternarDock(false);
    const original = btn.innerHTML;
    root.querySelectorAll<HTMLButtonElement>(".onb-comprar").forEach((b) => (b.disabled = true));
    const erro = $(".onb-erro");
    erro.hidden = true;
    try {
      btn.innerHTML = `Colocando no carrinho…`;
      await adicionarAoCarrinho(itens.map(({ sku, qtd, anotacao }) => ({ sku, qtd, anotacao })));
      rastrear("AddToCart", itens.length);
      btn.innerHTML = `No carrinho ✓`;
      irParaCarrinho();
    } catch (e) {
      erro.innerHTML = `${esc((e as Error).message)} <button type="button" class="onb-link-inline" data-whats>Falar com a fábrica</button>`;
      erro.hidden = false;
    } finally {
      setTimeout(() => {
        btn.innerHTML = original;
        root
          .querySelectorAll<HTMLButtonElement>(".onb-comprar")
          .forEach((b) => (b.disabled = false));
      }, 1500);
    }
  }

  function rastrear(evento: string, n: number) {
    const w = window as unknown as { fbq?: (...a: unknown[]) => void; dataLayer?: unknown[] };
    try {
      w.fbq?.("track", evento, { content_name: "Monte seu kit", num_items: n, currency: "BRL" });
      w.dataLayer?.push({
        event: "onb_lp_" + evento.toLowerCase(),
        modo: s.modo,
        instalacao: s.inst,
        medida: `${s.a}x${s.b}`,
      });
    } catch {
      /* rastreio nunca quebra a compra */
    }
  }

  function aoClique(b: HTMLButtonElement) {
    if (b.classList.contains("onb-comprar")) comprar(b);
    else if (b.classList.contains("onb-dock-preco")) alternarDock();
    else return false;
    return true;
  }

  return { atualizarPreco, aoClique };
}
