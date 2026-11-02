// Resumo: o que vai para o carrinho, o preço (total, Pix, por linha) e o botão Comprar.
import { faixaKit, pecasDaMontagem, skuKit } from "../builder";
import { ACESSORIOS, COMBO_GIRATORIO_CESTO, COOKTOP_SKU } from "../catalog";
import type { AccId } from "../conteudo";
import { adicionarAoCarrinho, irParaCarrinho, preco, type ItemCarrinho } from "../wbuy";
import { brl, esc } from "../util";
import type { Ctx } from "./estado";

type Item = ItemCarrinho & { chave: string | null };

export function montarResumo(ctx: Ctx) {
  const { root, $, s } = ctx;

  const comSuporte = () => (s.modo === "kit" ? !!faixaKit(s.a, s.b) : s.m.suporte.on);

  function itensCarrinho(): Item[] {
    const f = faixaKit(s.a, s.b);
    const nota = `Medida da churrasqueira: ${s.a}x${s.b} cm · ${s.inst} · ${s.amb} (LP Monte seu kit)`;
    const base: Item[] = [];
    if (s.modo === "kit") {
      if (f) base.push({ sku: skuKit(f.a, f.b)!, qtd: 1, anotacao: nota, chave: null });
    } else {
      // cada linha leva a sua chave para o preço aparecer ao lado dela no cartão
      const pos: Record<string, number> = { grelhas: 0, espetos: 0 };
      pecasDaMontagem(s.m).forEach((i, k) => {
        let chave: string = i.grupo;
        if (i.grupo === "grelhas" || i.grupo === "espetos") {
          const lista: { qtd: number }[] = i.grupo === "grelhas" ? s.m.grelhas : s.m.espetos;
          let p = pos[i.grupo];
          while (p < lista.length && lista[p].qtd === 0) p++;
          pos[i.grupo] = p + 1;
          chave = `${i.grupo}.${p}`;
        }
        base.push({ sku: i.sku, qtd: i.peca.qtd, anotacao: k === 0 ? nota : "", chave });
      });
    }
    if (s.inst === "cooktop" && comSuporte()) base.push({ sku: COOKTOP_SKU, qtd: 1, chave: null });
    const combo = s.acc.giratorio && s.acc.cesto;
    if (combo) base.push({ sku: COMBO_GIRATORIO_CESTO, qtd: 1, chave: null });
    (Object.keys(s.acc) as AccId[]).forEach((id) => {
      if (!s.acc[id] || (combo && (id === "giratorio" || id === "cesto"))) return;
      base.push({ sku: ACESSORIOS[id].sku, qtd: 1, chave: null });
    });
    return base;
  }

  let geracao = 0;
  async function atualizarPreco() {
    const g = ++geracao;
    const itens = itensCarrinho();
    root
      .querySelectorAll<HTMLButtonElement>(".onb-comprar")
      .forEach((b) => (b.disabled = itens.length === 0));
    if (!itens.length) return mostrarTotal(null, "Escolha ao menos uma peça");
    mostrarTotal(null, "Calculando…");
    const precos = await Promise.all(itens.map((i) => preco(i.sku)));
    if (g !== geracao) return;
    if (precos.some((p) => !p)) return mostrarTotal(null, "Preço indisponível agora");
    let total = 0;
    let pix = 0;
    const porGrupo: Record<string, number> = {};
    precos.forEach((p, i) => {
      const v = p!.valor * itens[i].qtd;
      total += v;
      pix += (p!.pix ?? p!.valor) * itens[i].qtd;
      const chave = itens[i].chave;
      if (!chave) return;
      const grupo = chave.split(".")[0];
      porGrupo[grupo] = (porGrupo[grupo] ?? 0) + v;
      const el = root.querySelector(`[data-preco-linha="${chave}"]`);
      if (el) el.textContent = brl(v);
    });
    Object.entries(porGrupo).forEach(([gr, v]) => {
      const el = root.querySelector(`[data-preco-grupo="${gr}"]`);
      if (el) el.textContent = brl(v);
    });
    mostrarTotal({ valor: total, pix: pix < total ? pix : null }, null);
    const prazo = precos.find((p) => p!.prazo)?.prazo;
    if (prazo) $(".onb-prazo").textContent = `Produção: ${prazo.toLowerCase()} + frete`;
  }

  function mostrarTotal(p: { valor: number; pix: number | null } | null, msg: string | null) {
    root.querySelectorAll(".onb-total").forEach((el) => {
      el.innerHTML = p
        ? `<span class="v">${brl(p.valor)}</span><span class="d">${p.pix ? `${brl(p.pix)} no Pix · ` : ""}até 10x sem juros</span>`
        : `<span class="v onb-pulso">${msg}</span>`;
    });
    root
      .querySelectorAll(".onb-barra-preco")
      .forEach((el) => (el.textContent = p ? brl(p.valor) : ""));
  }

  async function comprar(btn: HTMLButtonElement) {
    const itens = itensCarrinho();
    if (!itens.length) return;
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
    if (!b.classList.contains("onb-comprar")) return false;
    comprar(b);
    return true;
  }

  return { atualizarPreco, aoClique };
}
