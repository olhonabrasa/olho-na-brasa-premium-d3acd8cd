// Qual passo está na tela: o cartão que cruza o meio da viewport fica ativo (borda e ponto do
// trilho), as cotas só aparecem no passo das medidas e a legenda do palco diz onde a pessoa está.
import { AMBIENTES } from "../conteudo";
import type { Ctx } from "./estado";

export function montarPassos(ctx: Ctx) {
  const cartoes = [...ctx.root.querySelectorAll<HTMLElement>(".onb-painel .onb-passo")];
  const legenda = ctx.$(".onb-palco-legenda");
  const total = cartoes.length;
  let ativo: HTMLElement | null = null;

  // o resumo preso no topo da coluna (desktop) cruza o meio da tela sem a pessoa rolar: não conta
  const rolaveis = cartoes.filter((c) => getComputedStyle(c).position !== "sticky");
  // o cartão que cruza a faixa central da viewport (10% da altura) é o ativo; se dois cruzam
  // (cartões vizinhos), fica o mais perto do meio
  const observador = new IntersectionObserver(
    (es) => {
      if (!es.some((e) => e.isIntersecting)) return;
      const meio = innerHeight / 2;
      const perto = rolaveis
        .map((c) => {
          const r = c.getBoundingClientRect();
          return {
            c,
            d:
              r.top <= meio && r.bottom >= meio
                ? 0
                : Math.min(Math.abs(r.top - meio), Math.abs(r.bottom - meio)),
          };
        })
        .sort((a, b) => a.d - b.d)[0];
      if (perto) ativar(perto.c);
    },
    { rootMargin: "-45% 0px -45% 0px" },
  );
  rolaveis.forEach((c) => observador.observe(c));

  // com o montador fora da tela, nenhum passo está ativo (cotas somem, 3D inteiro a 1)
  const observadorMontador = new IntersectionObserver(([e]) => !e.isIntersecting && desativar());
  observadorMontador.observe(ctx.$("#onb-montador"));

  function desativar() {
    if (!ativo) return;
    if (ativo.id === "onb-passo-kit") ctx.acoes.apagarDestaque();
    ativo.classList.remove("ativo");
    ativo = null;
    ctx.passo = 0;
    if (ctx.s.medidas) {
      ctx.s.medidas = false;
      ctx.acoes.cotas(false);
    }
    atualizarLegenda();
  }

  function ativar(c: HTMLElement) {
    if (c === ativo) return;
    ativo?.classList.remove("ativo");
    if (ativo?.id === "onb-passo-kit") ctx.acoes.apagarDestaque();
    ativo = c;
    c.classList.add("ativo");
    // as linhas podem ter cruzado o meio antes de o cartão virar o ativo
    if (c.id === "onb-passo-kit") ctx.acoes.acenderDestaque();
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

  /** Ao trocar de cena o painel é remontado: solta os observadores deste. */
  function destruir() {
    observador.disconnect();
    observadorMontador.disconnect();
  }

  return { atualizarLegenda, destruir };
}
