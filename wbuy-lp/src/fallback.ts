// Desenho de frente do kit (SVG) para quando não há WebGL ou enquanto o 3D carrega.
import type { Composicao } from "@/lib/kitComposition";

export function desenhoFrente(c: Composicao, suporteFantasma: boolean) {
  const W = c.suporteLarguraCm;
  const esc = 300 / Math.max(W, 60);
  const w = W * esc;
  const h = 35 * esc;
  const x0 = (340 - w) / 2;
  const y0 = 20;
  const niveis = [0.048, 0.175, 0.302].map((y) => y0 + h - (y / 0.35) * h);
  const porNivel = Math.max(c.uruguaia.porNivel, 1);
  const nDisp = 3 - (c.descanso ? 1 : 0);
  const out: string[] = [];
  const traco = suporteFantasma ? `stroke-dasharray="5 4" opacity=".45"` : "";
  out.push(
    `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="3" fill="none" stroke="currentColor" stroke-width="4" ${traco}/>`,
  );
  niveis.forEach((y) =>
    out.push(
      `<line x1="${x0}" x2="${x0 + w}" y1="${y}" y2="${y}" stroke="currentColor" stroke-width="1.5" opacity=".5"/>`,
    ),
  );
  const gw = c.uruguaia.larguraCm * esc;
  const folga = Math.max(w - porNivel * gw, 4);
  const unit = folga / (porNivel + 1);
  for (let i = 0; i < c.uruguaia.quantidade; i++) {
    const nivel = Math.floor(i / porNivel);
    if (nivel >= nDisp) break;
    const x = x0 + unit + (i % porNivel) * (gw + unit);
    out.push(
      `<rect x="${x}" y="${niveis[nivel] - 7}" width="${gw}" height="7" rx="2" fill="var(--onb-laranja)"/>`,
    );
  }
  if (c.descanso) {
    const dw = c.descanso.larguraCm * esc;
    const n = c.descanso.quantidade;
    const fd = Math.max(w - n * dw, 4) / (n + 1);
    for (let i = 0; i < n; i++)
      out.push(
        `<rect x="${x0 + fd + i * (dw + fd)}" y="${niveis[2] - 6}" width="${dw}" height="6" rx="2" fill="currentColor" opacity=".7"/>`,
      );
  }
  for (let i = 0; i < c.espetos.quantidade; i++) {
    const x = x0 + w / 2 + (i - (c.espetos.quantidade - 1) / 2) * 22;
    out.push(`<circle cx="${x}" cy="${niveis[0] - 14}" r="4" fill="currentColor"/>`);
  }
  return `<svg viewBox="0 0 340 ${h + 40}" role="presentation">${out.join("")}</svg>`;
}
