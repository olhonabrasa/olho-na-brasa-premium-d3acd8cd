// Cotas A e B: as etiquetas em HTML que acompanham as setas de medida do 3D.
import type { Ctx } from "../estado";
import { medidasGeo, meio } from "./medidasGeo";

export function montarCotas(ctx: Ctx) {
  const rotA = ctx.$(".onb-rot-a");
  const rotB = ctx.$(".onb-rot-b");

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

  function posicionar() {
    const { s, stage } = ctx;
    const geo = s.medidas && stage ? geoMedidas() : null;
    rotA.hidden = rotB.hidden = !geo;
    if (!geo || !stage) return;
    const pa = stage.project(meio(geo.a));
    const pb = stage.project(meio(geo.b));
    rotA.style.transform = `translate(${pa.x}px, ${pa.y}px)`;
    rotB.style.transform = `translate(${pb.x}px, ${pb.y}px)`;
    rotA.querySelector("em")!.textContent = `${s.a} cm`;
    rotB.querySelector("em")!.textContent = `${s.b} cm`;
  }

  return { posicionar };
}
