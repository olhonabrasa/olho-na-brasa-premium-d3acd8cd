// Destaque de peça no 3D: as pílulas (estilo "Design" da Apple) acendem um grupo de peças.
import { PILULAS } from "../../conteudo";
import type { Ctx } from "../estado";

export function montarDestaque(ctx: Ctx) {
  const pilulas = [...ctx.root.querySelectorAll<HTMLButtonElement>("[data-pilula]")];

  function fecharPilulas() {
    pilulas.forEach((p) => p.setAttribute("aria-expanded", "false"));
  }

  pilulas.forEach((p) =>
    p.addEventListener("click", () => {
      const aberta = p.getAttribute("aria-expanded") === "true";
      fecharPilulas();
      ctx.acoes.fecharPop();
      const info = PILULAS.find((x) => x.id === p.dataset.pilula)!;
      if (aberta) return ctx.stage?.highlight(null);
      p.setAttribute("aria-expanded", "true");
      if (info.id === "medidas") {
        ctx.s.medidas = true;
        ctx.acoes.desenhar();
      } else ctx.stage?.highlight(info.partes);
    }),
  );

  return { fecharPilulas };
}
