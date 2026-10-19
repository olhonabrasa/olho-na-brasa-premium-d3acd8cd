// Regras da montagem (sem DOM, sem three.js): medida da churrasqueira ->
// peças sugeridas, limites de encaixe no suporte, composição para o 3D,
// pontos de "+" e itens do carrinho. A composição do Kit Premium vem de
// kitComposition (a mesma tabela da fábrica usada na LP Premium).
import { comprimentoGrelhaCm, kitComposition, peCm, type Composicao } from "@/lib/kitComposition";
import {
  descreverPeca,
  encaixar,
  encaixarAcima,
  KIT_A,
  KIT_B,
  MEDIDAS,
  skuKit,
  skuPeca,
  type Peca,
} from "./catalog";

export type EspetoTipo = "espeto_duplo" | "espeto_chata" | "espeto_v";

export type Montagem = {
  suporte: { on: boolean; larguraCm: number };
  uruguaia: { qtd: number; larguraCm: number; comprimentoCm: number };
  descanso: { qtd: number; larguraCm: number };
  espeto: { qtd: number; tipo: EspetoTipo; comprimentoCm: number };
};

export type Grupo = keyof Montagem;

export const A_MIN = 35;
export const A_MAX = 139;
export const B_MIN = 35;
export const B_MAX = 74;

const floor5 = (v: number) => Math.floor(v / 5) * 5;
const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);

/** Faixa do Kit Premium que atende a medida (arredonda para baixo, como a loja). */
export function faixaKit(a: number, b: number): { a: number; b: number } | null {
  if (!(a >= 50 && a < 100 && b >= 40 && b < 75)) return null;
  return { a: encaixar(KIT_A, a), b: encaixar(KIT_B, b) };
}

/** Mesma tabela da fábrica do kitComposition, estendida para suportes acima de 95. */
function grelhasDoSuporte(s: number) {
  const tabela: [number, number, number, number][] = [
    [55, 22, 44, 1],
    [65, 27, 54, 1],
    [75, 32, 64, 1],
    [90, 37, 37, 2],
    [95, 40, 40, 2],
  ];
  const l = tabela.find(([ate]) => s <= ate);
  // a loja vende descanso de 5 em 5 cm: a medida da fábrica cai para a largura vendida logo abaixo
  if (l) return { uruguaia: l[1], descanso: encaixar(MEDIDAS.descanso, l[2]), descansoQtd: l[3] };
  const meia = (s - 10) / 2;
  return {
    uruguaia: encaixar(MEDIDAS.uruguaiaLargura, meia),
    descanso: encaixar(MEDIDAS.descanso, meia),
    descansoQtd: 2,
  };
}

/** Peças sugeridas para a medida: o equivalente ao kit, montado peça a peça. */
export function montagemSugerida(a: number, b: number): Montagem {
  const s = encaixar(MEDIDAS.suporte, clamp(floor5(a), A_MIN, A_MAX));
  const g = grelhasDoSuporte(s);
  const comp = clamp(comprimentoGrelhaCm(clamp(floor5(b), 40, 70)), 35, 55);
  return {
    suporte: { on: true, larguraCm: s },
    uruguaia: { qtd: 2, larguraCm: g.uruguaia, comprimentoCm: comp },
    descanso: { qtd: g.descansoQtd, larguraCm: g.descanso },
    espeto: {
      qtd: 2,
      tipo: "espeto_duplo",
      comprimentoCm: encaixarAcima(MEDIDAS.espeto, comp + 25),
    },
  };
}

/** Quantas peças de cada cabem no suporte (3 níveis, 2 grelhas por nível). */
export function capacidade(m: Montagem) {
  const s = m.suporte.larguraCm;
  const nivelGrelha = 3 - (m.descanso.qtd > 0 ? 1 : 0);
  return {
    uruguaia: m.uruguaia.larguraCm * 2 <= s ? nivelGrelha * 2 : nivelGrelha,
    descanso: m.uruguaia.qtd > 4 ? 0 : m.descanso.larguraCm * 2 <= s ? 2 : 1,
    espeto: 4,
  };
}

/** Ajusta quantidades que deixaram de caber (ex.: trocou o suporte por um menor). */
export function normalizar(m: Montagem): Montagem {
  const out: Montagem = JSON.parse(JSON.stringify(m));
  const cap = capacidade(out);
  out.descanso.qtd = clamp(out.descanso.qtd, 0, cap.descanso);
  const cap2 = capacidade(out);
  out.uruguaia.qtd = clamp(out.uruguaia.qtd, 0, cap2.uruguaia);
  out.espeto.qtd = clamp(out.espeto.qtd, 0, cap2.espeto);
  return out;
}

export function composicaoMontagem(m: Montagem, b: number): Composicao {
  const porNivel = m.uruguaia.larguraCm * 2 <= m.suporte.larguraCm ? 2 : 1;
  return {
    suporteLarguraCm: m.suporte.larguraCm,
    niveis: 3,
    uruguaia: {
      larguraCm: m.uruguaia.qtd ? m.uruguaia.larguraCm : 0,
      comprimentoCm: m.uruguaia.qtd ? m.uruguaia.comprimentoCm : 0,
      porNivel: porNivel as 2,
      quantidade: m.uruguaia.qtd,
    },
    descanso: m.descanso.qtd
      ? { larguraCm: m.descanso.larguraCm, quantidade: m.descanso.qtd }
      : null,
    espetos: {
      tipo: m.espeto.tipo === "espeto_duplo" ? "duplo" : "simples",
      comprimentoCm: m.espeto.qtd ? m.espeto.comprimentoCm : 0,
      quantidade: m.espeto.qtd,
    },
    peCm: peCm(clamp(floor5(b), 40, 70)),
  };
}

export function composicaoKit(a: number, b: number): Composicao | null {
  const f = faixaKit(a, b);
  return f ? kitComposition(f.a, f.b) : null;
}

/** Nome do grupo 3D -> cartão de peça. */
export function grupoDaParte(parte: string): Grupo | null {
  if (parte === "suporte") return "suporte";
  if (parte.startsWith("grelha_uruguaia")) return "uruguaia";
  if (parte.startsWith("grelha_descanso")) return "descanso";
  if (parte.startsWith("espeto")) return "espeto";
  return null;
}

export type Ancora = { grupo: Grupo; rotulo: string; pos: [number, number, number] };

// mesmas constantes do buildKit (geometry.ts)
const BASE = 0.16;
const ALTURAS = [0.048, 0.175, 0.302].map((y) => y + BASE);
const FRAME_Z = -0.1;

/** Pontos de "+" onde ainda cabe peça. */
export function ancoras(m: Montagem): Ancora[] {
  const out: Ancora[] = [];
  const W = m.suporte.larguraCm / 100;
  if (!m.suporte.on)
    out.push({ grupo: "suporte", rotulo: "Incluir suporte", pos: [0, BASE + 0.39, FRAME_Z] });
  const cap = capacidade(m);
  const gw = m.uruguaia.larguraCm / 100;
  const gd = m.uruguaia.comprimentoCm / 100;
  const porNivel = gw * 2 <= W ? 2 : 1;
  if (m.uruguaia.qtd < cap.uruguaia) {
    const folga = Math.max(W - porNivel * gw, 0.02);
    const unit = folga / (porNivel + 1);
    const idx = m.uruguaia.qtd;
    const nivel = Math.floor(idx / porNivel);
    const x = -W / 2 + unit + gw / 2 + (idx % porNivel) * (gw + unit);
    out.push({
      grupo: "uruguaia",
      rotulo: "Grelha",
      pos: [x, ALTURAS[nivel] + 0.01, FRAME_Z + 0.051 + gd / 2],
    });
  }
  if (m.descanso.qtd < cap.descanso) {
    const x = m.descanso.qtd === 0 ? 0 : W / 4;
    out.push({
      grupo: "descanso",
      rotulo: "Descanso",
      pos: [x, ALTURAS[2] + 0.01, FRAME_Z + 0.146],
    });
  }
  if (m.espeto.qtd < cap.espeto) {
    out.push({
      grupo: "espeto",
      rotulo: "Espeto",
      pos: [W * 0.32, ALTURAS[0] + 0.03, FRAME_Z + 0.42],
    });
  }
  return out;
}

export type ItemResumo = { peca: Peca; sku: string; rotulo: string };

export function pecasDaMontagem(m: Montagem): ItemResumo[] {
  const lista: Peca[] = [];
  if (m.suporte.on) lista.push({ tipo: "suporte", larguraCm: m.suporte.larguraCm, qtd: 1 });
  if (m.uruguaia.qtd)
    lista.push({
      tipo: "uruguaia",
      larguraCm: m.uruguaia.larguraCm,
      comprimentoCm: m.uruguaia.comprimentoCm,
      qtd: m.uruguaia.qtd,
    });
  if (m.descanso.qtd)
    lista.push({ tipo: "descanso", larguraCm: m.descanso.larguraCm, qtd: m.descanso.qtd });
  if (m.espeto.qtd)
    lista.push({ tipo: m.espeto.tipo, larguraCm: m.espeto.comprimentoCm, qtd: m.espeto.qtd });
  return lista.flatMap((p) => {
    const sku = skuPeca(p);
    return sku ? [{ peca: p, sku, rotulo: descreverPeca(p) }] : [];
  });
}

/** O que vem no Kit Premium da faixa (para a lista "vem no kit"). */
export function conteudoKit(c: Composicao) {
  const l = [`Suporte suspenso ${c.suporteLarguraCm} cm · 3 níveis`];
  l.push(
    `${c.uruguaia.quantidade} grelhas uruguaias ${c.uruguaia.larguraCm}×${c.uruguaia.comprimentoCm} cm`,
  );
  if (c.descanso)
    l.push(
      `${c.descanso.quantidade} ${c.descanso.quantidade > 1 ? "grelhas" : "grelha"} de descanso ${c.descanso.larguraCm} cm`,
    );
  l.push(`${c.espetos.quantidade} espetos duplos ${c.espetos.comprimentoCm} cm`);
  l.push(`Pés de fixação ${c.peCm} cm, parafusos inclusos`);
  return l;
}

export { skuKit };
