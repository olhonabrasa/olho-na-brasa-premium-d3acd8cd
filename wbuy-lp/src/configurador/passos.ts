// Qual passo está na tela: o cartão que cruza o meio da viewport fica ativo (borda e ponto do
// trilho), as cotas só aparecem no passo das medidas e a legenda do palco diz onde a pessoa está.
import { AMBIENTES } from "../conteudo";
import type { Ctx } from "./estado";

export function montarPassos(ctx: Ctx) {
  const cartoes = [...ctx.root.querySelectorAll<HTMLElement>(".onb-painel .onb-passo")];
  const legenda = ctx.$(".onb-palco-legenda");
  const total = cartoes.length;
  let ativo: HTMLElement | null = null;

  // o cartão que cruza a faixa central da viewport (10% da altura) é o ativo
  const observador = new IntersectionObserver(
    (es) => es.forEach((e) => e.isIntersecting && ativar(e.target as HTMLElement)),
    { rootMargin: "-45% 0px -45% 0px" },
  );
  // o resumo preso no topo da coluna (desktop) cruza o meio da tela sem a pessoa rolar: não conta
  cartoes.forEach((c) => getComputedStyle(c).position !== "sticky" && observador.observe(c));

  function ativar(c: HTMLElement) {
    if (c === ativo) return;
    ativo?.classList.remove("ativo");
    ativo = c;
    c.classList.add("ativo");
    ctx.passo = cartoes.indexOf(c) + 1;
    const medidas = c.id === "onb-passo-medidas";
    if (medidas !== ctx.s.medidas) {
      ctx.s.medidas = medidas;
      ctx.acoes.cotas(medidas);
    }
    atualizarLegenda();
  }

  /** "70 × 60 cm · Fechada · passo 2 de 5". */
  function atualizarLegenda() {
    const { s, passo } = ctx;
    const amb = AMBIENTES.find((x) => x.id === s.amb)!.nome;
    legenda.textContent = `${s.a} × ${s.b} cm · ${amb}${passo ? ` · passo ${passo} de ${total}` : ""}`;
  }

  return { atualizarLegenda };
}
