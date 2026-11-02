// KitConfigurador: o montador 3D da LP. Um componente só; o que muda entre "Kit Premium" e
// "Montar o meu" é a cena (data/cenas.ts). O palco e as cotas vivem o tempo todo; o painel de
// passos é remontado quando a pessoa troca de cena.
import { composicaoKit, composicaoMontagem } from "../builder";
import { CENAS, type CenaId } from "../data/cenas";
import { painelMontador } from "../dobras";
import { abrirWhats } from "../interacoes";
import { MODO_SIMULADO } from "../wbuy";
import { montarAcessorios } from "./acessorios";
import { montarChurrasqueira } from "./churrasqueira";
import { estadoInicial, type Acoes, type Ctx, type Estado } from "./estado";
import { montarMedidas } from "./medidas";
import { montarCotas } from "./palco/cotas";
import { montarPalco } from "./palco/palco";
import { montarPassos } from "./passos";
import { montarPecas } from "./pecas";
import { montarResumo } from "./resumo";

export { estadoInicial } from "./estado";
export { cenaDaUrl } from "../data/cenas";

type Opcoes = { reduzido: boolean; params: URLSearchParams };

export function KitConfigurador(
  root: HTMLElement,
  s0: Estado,
  cena0: (typeof CENAS)[CenaId],
  { reduzido, params }: Opcoes,
) {
  const $ = <T extends Element = HTMLElement>(sel: string) => root.querySelector(sel) as T;
  const ctx: Ctx = {
    root,
    $,
    s: s0,
    cena: cena0,
    params,
    reduzido,
    stage: null,
    comp: null,
    passo: 0,
    // preenchido em montarPainel, depois que os passos existem
    acoes: {} as Acoes,
  };

  // ---------- o que vive o tempo todo: palco e cotas ----------
  const cotas = montarCotas(ctx);
  const palco = montarPalco(ctx, {
    aoEscolher: (parte, x, y) => atual.pecas.escolherNo3D(parte, x, y),
    aoDesenhar: cotas.posicionar,
  });

  const irMontador = () =>
    $("#onb-montador").scrollIntoView({ behavior: reduzido ? "auto" : "smooth", block: "start" });

  // o palco e o resumo presos param logo abaixo do que está fixo acima deles (a barra do produto)
  const barra = $(".onb-barra-dentro");
  const medirNav = () =>
    root.style.setProperty(
      "--nav-h",
      `${barra.getClientRects().length ? barra.offsetHeight : 0}px`,
    );
  medirNav();
  addEventListener("resize", medirNav);

  // ---------- estado -> tela ----------
  function desenhar() {
    const { s } = ctx;
    // no premium, fora da faixa do kit o 3D mostra a montagem sugerida, só para a pessoa ver o tamanho
    ctx.comp =
      ctx.cena.modo === "kit"
        ? (composicaoKit(s.a, s.b) ?? composicaoMontagem(s.m, s.b))
        : composicaoMontagem(s.m, s.b);
    palco.atualizar();
    cotas.posicionar();
    atual.passos.atualizarLegenda();
    atual.churrasqueira.renderEscolhas();
    atual.pecas.renderConteudo();
    atual.acessorios.render();
    atual.resumo.atualizarPreco();
  }

  // ---------- o painel de passos: remontado a cada cena ----------
  function montarPainel() {
    const pecas = montarPecas(ctx);
    const medidas = montarMedidas(ctx);
    const churrasqueira = montarChurrasqueira(ctx);
    const acessorios = montarAcessorios(ctx);
    const resumo = montarResumo(ctx);
    const passos = montarPassos(ctx);
    Object.assign(ctx.acoes, {
      desenhar,
      fecharPop: pecas.fecharPop,
      definirInstalacao: churrasqueira.definirInstalacao,
      alternarAcessorio: acessorios.alternar,
      irMontador,
      cotas: cotas.mostrar,
      previaMedida: cotas.previa,
      acenderDestaque: pecas.acenderPerto,
      apagarDestaque: pecas.apagarLinhas,
    } satisfies Acoes);
    return { pecas, medidas, churrasqueira, acessorios, resumo, passos };
  }
  let atual = montarPainel();

  /** Troca de cena pelo controle segmentado: A e B ficam, o resto reinicia; a URL acompanha. */
  function trocarCena(id: CenaId) {
    if (id === ctx.cena.id) return;
    atual.passos.destruir();
    atual.pecas.destruir();
    atual.pecas.fecharPop();
    cotas.mostrar(false);
    ctx.stage?.focar(null);
    const { a, b } = ctx.s;
    ctx.cena = CENAS[id];
    ctx.s = estadoInicial(params, ctx.cena, { a, b });
    ctx.passo = 0;
    $(".onb-montador-topo .onb-eyebrow").textContent = ctx.cena.eyebrow;
    $("#onb-montador-t").textContent = ctx.cena.titulo;
    root
      .querySelectorAll<HTMLButtonElement>("[data-kit]")
      .forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.kit === id)));
    $(".onb-painel").innerHTML = painelMontador(ctx.s, ctx.cena);
    atual = montarPainel();
    const url = new URL(location.href);
    url.searchParams.set("kit", id);
    history.replaceState(null, "", url);
    desenhar();
  }

  // ---------- eventos: cada passo diz se o alvo era dele ----------
  root.addEventListener("input", (e) => {
    const t = e.target as HTMLInputElement;
    atual.medidas.aoInput(t) || atual.pecas.aoInput(t);
  });
  root.addEventListener("change", (e) => {
    const t = e.target as HTMLInputElement;
    atual.medidas.aoChange(t) || atual.pecas.aoChange(t);
  });
  root.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>("button");
    if (!b || b.disabled) return;
    if (b.dataset.kit) return trocarCena(b.dataset.kit as CenaId);
    if (b.dataset.pop) return atual.pecas.aoPop(b);
    if (b.hasAttribute("data-whats")) {
      const { s } = ctx;
      return abrirWhats(
        `Quero o ${ctx.cena.modo === "kit" ? "Kit Premium" : `kit ${s.inst}`} para ${s.a}x${s.b} cm`,
      );
    }
    if (
      atual.pecas.aoClique(b) ||
      atual.churrasqueira.aoClique(b) ||
      atual.acessorios.aoClique(b) ||
      atual.resumo.aoClique(b)
    )
      return;
    if (b.hasAttribute("data-ir-montador")) irMontador();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && atual.pecas.popAberto()) atual.pecas.fecharPop();
  });

  if (MODO_SIMULADO)
    root.insertAdjacentHTML(
      "afterbegin",
      `<p class="onb-simulado">Modo simulado (fora da loja): preços de exemplo, carrinho não é alterado.</p>`,
    );
  desenhar();
}
