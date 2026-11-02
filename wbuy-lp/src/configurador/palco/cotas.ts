// Cotas A e B: a única coisa sobre o 3D. Linha de 1px com traços nas pontas e uma pastilha
// no meio com a letra e o valor, tudo em HTML/SVG projetado da cena a cada quadro.
import type { Ctx } from "../estado";
import { medidasGeo, meio, type Ponto } from "./medidasGeo";

const TRACO = 4; // metade do traço de 8px nas pontas
type Nome = "a" | "b";

export function montarCotas(ctx: Ctx) {
  const raiz = ctx.$(".onb-cotas");
  const svg = raiz.querySelector("svg")!;
  svg.innerHTML = (["a", "b"] as Nome[])
    .map(
      (n) =>
        `<g data-cota="${n}"><line class="l"></line><line class="t1"></line><line class="t2"></line></g>`,
    )
    .join("");
  const grupo = (n: Nome) => svg.querySelector<SVGGElement>(`[data-cota="${n}"]`)!;
  const pastilha = (n: Nome) => raiz.querySelector<HTMLElement>(`.onb-cota[data-cota="${n}"]`)!;
  const valor = (n: Nome) => pastilha(n).querySelector("em")!;
  let arrastando: Nome | null = null;

  function geoMedidas() {
    const c = ctx.comp;
    if (!c) return null;
    return medidasGeo({
      a: ctx.s.a / 100,
      b: ctx.s.b / 100,
      instalacao: ctx.s.inst,
      peM: c.peCm / 100,
      suporteM: c.suporteLarguraCm / 100,
    });
  }

  const linha = (el: Element, x1: number, y1: number, x2: number, y2: number) => {
    el.setAttribute("x1", x1.toFixed(1));
    el.setAttribute("y1", y1.toFixed(1));
    el.setAttribute("x2", x2.toFixed(1));
    el.setAttribute("y2", y2.toFixed(1));
  };

  function desenharCota(n: Nome, pontos: [Ponto, Ponto]) {
    const stage = ctx.stage!;
    const p1 = stage.project(pontos[0]);
    const p2 = stage.project(pontos[1]);
    const g = grupo(n);
    const pa = pastilha(n);
    const atras = p1.atras || p2.atras;
    g.style.display = pa.style.display = atras ? "none" : "";
    if (atras) return;
    // direção da linha e a normal, para os traços de 8px nas pontas
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = (-dy / len) * TRACO;
    const ny = (dx / len) * TRACO;
    linha(g.children[0], p1.x, p1.y, p2.x, p2.y);
    linha(g.children[1], p1.x - nx, p1.y - ny, p1.x + nx, p1.y + ny);
    linha(g.children[2], p2.x - nx, p2.y - ny, p2.x + nx, p2.y + ny);
    const m = stage.project(meio(pontos));
    pa.style.transform = `translate(${m.x.toFixed(1)}px, ${m.y.toFixed(1)}px) translate(-50%, -50%)`;
  }

  /** Reposiciona linhas e pastilhas (a cada quadro do 3D e a cada redesenho). */
  function posicionar() {
    const geo = ctx.stage ? geoMedidas() : null;
    raiz.hidden = !geo;
    if (!geo) return;
    desenharCota("a", geo.a);
    desenharCota("b", geo.b);
    if (arrastando !== "a") valor("a").textContent = `${ctx.s.a} cm`;
    if (arrastando !== "b") valor("b").textContent = `${ctx.s.b} cm`;
  }

  /** Só no passo das medidas (fusão de 180 ms pelo CSS). */
  function mostrar(on: boolean) {
    raiz.classList.toggle("on", on);
  }

  /** A régua está em arraste: a pastilha acende e o número acompanha antes de o 3D redesenhar. */
  function previa(n: Nome, v: number | null) {
    arrastando = v === null ? null : n;
    pastilha(n).classList.toggle("arrastando", v !== null);
    valor(n).textContent = `${v ?? ctx.s[n]} cm`;
  }

  return { posicionar, mostrar, previa };
}
