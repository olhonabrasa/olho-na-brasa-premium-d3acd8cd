// Onde medir a churrasqueira, em metros, no mesmo espaço do 3D (sem three.js:
// o script inicial usa isto para posicionar as etiquetas A e B).
// A atravessa a boca de parede a parede, um pouco acima do suporte;
// B corre pelo piso do braseiro, do fundo até a boca, encostado na lateral esquerda.

export type Ponto = [number, number, number];
export type MedidasGeo = { a: [Ponto, Ponto]; b: [Ponto, Ponto] };

const BASE_Y = 0.16;
const FRAME_Z = -0.1;
const TUBO = 0.03;

export function medidasGeo(p: {
  a: number;
  b: number;
  instalacao: "suspenso" | "cooktop";
  peM: number;
  suporteM: number;
}): MedidasGeo {
  const cook = p.instalacao === "cooktop";
  const A = Math.max(p.a, p.suporteM + 0.02);
  const fundoZ = cook ? FRAME_Z - TUBO - 0.012 : FRAME_Z - TUBO - p.peM - 0.004;
  const frenteZ = fundoZ + Math.max(p.b, 0.4);
  const yA = BASE_Y + 0.43;
  const yB = cook ? BASE_Y - 0.02 : 0.012;
  const xB = -A / 2 + 0.05;
  return {
    a: [
      [-A / 2, yA, frenteZ],
      [A / 2, yA, frenteZ],
    ],
    b: [
      [xB, yB, fundoZ],
      [xB, yB, frenteZ],
    ],
  };
}

export const meio = (l: [Ponto, Ponto]): Ponto => [
  (l[0][0] + l[1][0]) / 2,
  (l[0][1] + l[1][1]) / 2,
  (l[0][2] + l[1][2]) / 2,
];
