// KitConfigurador: o montador 3D da LP. Um componente só; o que muda entre modos é o estado.
// Cada passo mora no seu arquivo e conversa com os outros por `ctx.acoes`.
import { composicaoKit, composicaoMontagem } from "../builder";
import { abrirWhats } from "../interacoes";
import { MODO_SIMULADO } from "../wbuy";
import { montarAcessorios } from "./acessorios";
import { montarChurrasqueira } from "./churrasqueira";
import type { Acoes, Ctx, Estado } from "./estado";
import { montarMedidas } from "./medidas";
import { montarCotas } from "./palco/cotas";
import { montarPalco } from "./palco/palco";
import { montarPassos } from "./passos";
import { montarPecas } from "./pecas";
import { montarResumo } from "./resumo";

export { estadoInicial } from "./estado";

type Opcoes = { reduzido: boolean; params: URLSearchParams };

export function KitConfigurador(root: HTMLElement, s: Estado, { reduzido, params }: Opcoes) {
  const $ = <T extends Element = HTMLElement>(sel: string) => root.querySelector(sel) as T;
  const ctx: Ctx = {
    root,
    $,
    s,
    params,
    reduzido,
    stage: null,
    comp: null,
    passo: 0,
    // preenchido logo abaixo, depois que os passos existem
    acoes: {} as Acoes,
  };

  const cotas = montarCotas(ctx);
  const pecas = montarPecas(ctx);
  const palco = montarPalco(ctx, { aoEscolher: pecas.escolherNo3D, aoDesenhar: cotas.posicionar });
  const medidas = montarMedidas(ctx);
  const churrasqueira = montarChurrasqueira(ctx);
  const acessorios = montarAcessorios(ctx);
  const resumo = montarResumo(ctx);
  const passos = montarPassos(ctx);

  const irMontador = () =>
    $("#onb-montador").scrollIntoView({ behavior: reduzido ? "auto" : "smooth", block: "start" });

  // o palco preso para logo abaixo do que está fixo acima dele (a barra do produto, no desktop)
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
    ctx.comp = s.modo === "kit" ? composicaoKit(s.a, s.b) : composicaoMontagem(s.m, s.b);
    palco.atualizar();
    cotas.posicionar();
    passos.atualizarLegenda();
    churrasqueira.renderEscolhas();
    pecas.renderConteudo();
    acessorios.render();
    resumo.atualizarPreco();
  }

  Object.assign(ctx.acoes, {
    desenhar,
    fecharPop: pecas.fecharPop,
    definirModo: pecas.definirModo,
    definirInstalacao: churrasqueira.definirInstalacao,
    alternarAcessorio: acessorios.alternar,
    irMontador,
    cotas: cotas.mostrar,
    previaMedida: cotas.previa,
  } satisfies Acoes);

  // ---------- eventos: cada passo diz se o alvo era dele ----------
  root.addEventListener("input", (e) => {
    const t = e.target as HTMLInputElement;
    medidas.aoInput(t) || pecas.aoInput(t);
  });
  root.addEventListener("change", (e) => {
    const t = e.target as HTMLInputElement;
    medidas.aoChange(t) || pecas.aoChange(t) || acessorios.aoChange(t);
  });
  root.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>("button");
    if (!b || b.disabled) return;
    if (b.hasAttribute("data-whats"))
      return abrirWhats(`Quero o kit ${s.inst} para ${s.a}x${s.b} cm`);
    if (pecas.aoClique(b) || churrasqueira.aoClique(b) || acessorios.aoClique(b)) return;
    if (resumo.aoClique(b)) return;
    if (b.hasAttribute("data-ir-montador")) irMontador();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && pecas.popAberto()) pecas.fecharPop();
  });

  if (MODO_SIMULADO)
    root.insertAdjacentHTML(
      "afterbegin",
      `<p class="onb-simulado">Modo simulado (fora da loja): preços de exemplo, carrinho não é alterado.</p>`,
    );
  desenhar();
}
