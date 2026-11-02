// Pontos de "+" sobre o canvas: onde ainda cabe peça no modo peça por peça.
import { ancoras, type Grupo } from "../../builder";
import type { Ctx } from "../estado";

export function montarHotspots(ctx: Ctx) {
  const hotspots = ctx.$(".onb-hotspots");
  let ancorasAtuais: ReturnType<typeof ancoras> = [];

  function montar() {
    ancorasAtuais = ctx.s.modo === "pecas" && ctx.stage ? ancoras(ctx.s.m) : [];
    hotspots.innerHTML = ancorasAtuais
      .map(
        (a, i) =>
          `<button type="button" class="onb-hot" data-i="${i}" data-grupo="${a.grupo}" aria-label="Adicionar ${a.rotulo.toLowerCase()}"><span aria-hidden="true">+</span><em>${a.rotulo}</em></button>`,
      )
      .join("");
    posicionar();
  }

  function posicionar() {
    const stage = ctx.stage;
    if (!stage) return;
    const els = hotspots.children;
    const usados: { x: number; y: number }[] = [];
    ancorasAtuais.forEach((a, i) => {
      const el = els[i] as HTMLElement | undefined;
      if (!el) return;
      const p = stage.project(a.pos);
      while (usados.some((u) => Math.abs(u.x - p.x) < 120 && Math.abs(u.y - p.y) < 42)) p.y += 44;
      usados.push({ x: p.x, y: p.y });
      el.style.transform = `translate(${p.x}px, ${p.y}px)`;
      el.hidden = p.atras;
    });
  }

  hotspots.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>(".onb-hot");
    if (b) ctx.acoes.alterar(b.dataset.grupo as Grupo, +1);
  });

  return { montar, posicionar };
}
