// Composição física do kit (quais peças e em que tamanho), a partir da tabela
// da fábrica (Tabela_de_Medidas_Fabrica_SJ / briefing do 3D, seção 5).
// Módulo puro, sem imports: o 3D só DESENHA o que esta função devolve.
// Preço e faixa continuam em pricing.ts; aqui entra a faixa já calculada lá.

export type Composicao = {
  suporteLarguraCm: number;
  niveis: 3;
  uruguaia: { larguraCm: number; comprimentoCm: number; porNivel: number; quantidade: number };
  /** profundidade fixa de 20 cm */
  descanso: { larguraCm: number; quantidade: number } | null;
  espetos: { tipo: "duplo" | "simples"; comprimentoCm: number; quantidade: number };
  peCm: number;
};

/** Suporte (cm) -> grelha uruguaia e descanso. Faixas de 5 em 5, de 50 a 95. */
const TABELA: {
  de: number;
  ate: number;
  uruguaia: number;
  descanso: number;
  descansoQtd: number;
}[] = [
  { de: 50, ate: 55, uruguaia: 22, descanso: 44, descansoQtd: 1 },
  { de: 60, ate: 65, uruguaia: 27, descanso: 54, descansoQtd: 1 },
  { de: 70, ate: 75, uruguaia: 32, descanso: 64, descansoQtd: 1 },
  { de: 80, ate: 90, uruguaia: 37, descanso: 37, descansoQtd: 2 },
  { de: 95, ate: 95, uruguaia: 40, descanso: 40, descansoQtd: 2 },
];

export const B_MIN = 40;
export const B_MAX = 70;

const floor5 = (v: number) => Math.floor(v / 5) * 5;
const ceil5 = (v: number) => Math.ceil(v / 5) * 5;

/** Comprimento do pé de fixação (cm): 7 até B 57; depois (B − 50) na faixa de 5, mínimo 7. */
export function peCm(b: number) {
  return b <= 57 ? 7 : Math.max(floor5(b - 50), 7);
}

/** Comprimento da grelha uruguaia (cm) a partir do comprimento interno B. */
export function comprimentoGrelhaCm(b: number) {
  const disponivel = Math.min(b - peCm(b), 50);
  return ceil5(disponivel) + 5;
}

/**
 * Kit Premium para a faixa (A, B) em cm, normalmente a faixa que o pricing.ts
 * cobrou (tier_width_cm × tier_depth_cm). Devolve null fora da tabela.
 */
export function kitComposition(a: number, b: number): Composicao | null {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  const suporte = floor5(a);
  const linha = TABELA.find((l) => suporte >= l.de && suporte <= l.ate);
  if (!linha) return null;
  if (b < B_MIN || b > B_MAX + 4) return null;
  const bFaixa = Math.min(floor5(b), B_MAX);
  const grelha = comprimentoGrelhaCm(bFaixa);
  return {
    suporteLarguraCm: suporte,
    niveis: 3,
    uruguaia: { larguraCm: linha.uruguaia, comprimentoCm: grelha, porNivel: 2, quantidade: 2 },
    descanso: { larguraCm: linha.descanso, quantidade: linha.descansoQtd },
    espetos: { tipo: "duplo", comprimentoCm: grelha + 25, quantidade: 2 },
    peCm: peCm(bFaixa),
  };
}

/** Peças escolhidas no "Monte o seu" (mesmo formato de Piece do pricing.ts). */
export type PecaEscolhida = { item_id: string; width_cm: number; depth_cm: number; qty: number };

/**
 * Composição para desenhar o "Monte o seu": só traduz as peças já escolhidas
 * (tamanho e quantidade vêm do pricing). Sem suporte escolhido, usa a largura
 * da boca apenas para desenhar a moldura de referência.
 */
export function compositionFromPieces(
  pieces: PecaEscolhida[],
  larguraBocaCm: number,
  compBocaCm: number,
): Composicao | null {
  const q = (id: string) => pieces.filter((p) => p.item_id === id && p.qty > 0);
  const sup = q("suporte_suspenso")[0];
  const suporte = sup ? sup.width_cm : floor5(larguraBocaCm);
  if (suporte < 45 || suporte > 130) return null;
  const uru = q("grelha_uruguaia").sort((x, y) => y.width_cm - x.width_cm)[0];
  const desc = q("grelha_descanso").sort((x, y) => y.width_cm - x.width_cm)[0];
  const esp = [...q("espeto_barra_chata"), ...q("espeto_v")];
  const espQtd = esp.reduce((s, p) => s + p.qty, 0);
  const uruQtd = q("grelha_uruguaia").reduce((s, p) => s + p.qty, 0);
  const bRef = Math.min(Math.max(floor5(compBocaCm), B_MIN), B_MAX);
  return {
    suporteLarguraCm: suporte,
    niveis: 3,
    uruguaia: {
      larguraCm: uru ? uru.width_cm : 0,
      comprimentoCm: uru ? uru.depth_cm : 0,
      porNivel: 2,
      quantidade: Math.min(uruQtd, 4),
    },
    descanso: desc ? { larguraCm: desc.width_cm, quantidade: Math.min(desc.qty, 2) } : null,
    espetos: {
      tipo: "simples",
      comprimentoCm: esp.length ? Math.max(...esp.map((p) => p.width_cm)) : 0,
      quantidade: Math.min(espQtd, 4),
    },
    peCm: peCm(bRef),
  };
}

/** Frase para o aria-label do canvas. */
export function describeComposition(c: Composicao, a: number, b: number) {
  const partes = [`Kit suporte suspenso ${c.suporteLarguraCm} cm, ${c.niveis} níveis`];
  if (c.uruguaia.quantidade)
    partes.push(
      `${c.uruguaia.quantidade} ${c.uruguaia.quantidade > 1 ? "grelhas uruguaias" : "grelha uruguaia"} de ${c.uruguaia.larguraCm} por ${c.uruguaia.comprimentoCm} cm`,
    );
  if (c.descanso?.quantidade)
    partes.push(
      `${c.descanso.quantidade} ${c.descanso.quantidade > 1 ? "grelhas de descanso" : "grelha de descanso"} de ${c.descanso.larguraCm} cm`,
    );
  if (c.espetos.quantidade)
    partes.push(
      `${c.espetos.quantidade} ${c.espetos.tipo === "duplo" ? "espetos duplos" : "espetos"} de ${c.espetos.comprimentoCm} cm`,
    );
  return `${partes.join(", ")}, para churrasqueira de ${a} por ${b} cm`;
}
