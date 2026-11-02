// Regras da montagem (sem DOM, sem three.js): medida da churrasqueira ->
// peças sugeridas, limites de encaixe no suporte, composição para o 3D,
// pontos de "+" e itens do carrinho. A composição do Kit Premium vem de
// kitComposition (a mesma tabela da fábrica usada na LP Premium).
//
// Grelhas e espetos são listas de linhas: o cliente pode misturar tipos
// (uma uruguaia e uma argentina; um duplo e dois barra chata) e cada linha
// tem a sua medida e quantidade.
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

export type GrelhaTipo = "uruguaia" | "argentina";
export type EspetoTipo = "espeto_duplo" | "espeto_chata" | "espeto_v";

export type LinhaGrelha = {
  tipo: GrelhaTipo;
  larguraCm: number;
  comprimentoCm: number;
  qtd: number;
};
export type LinhaEspeto = { tipo: EspetoTipo; comprimentoCm: number; qtd: number };

export type Montagem = {
  suporte: { on: boolean; larguraCm: number };
  grelhas: LinhaGrelha[];
  descanso: { qtd: number; larguraCm: number };
  espetos: LinhaEspeto[];
};

export type Grupo = "suporte" | "grelhas" | "descanso" | "espetos";

export const A_MIN = 35;
export const A_MAX = 139;
export const B_MIN = 35;
export const B_MAX = 74;
/** espetos simultâneos no suporte (fora o giratório, que tem apoio próprio) */
export const MAX_ESPETOS = 6;

const floor5 = (v: number) => Math.floor(v / 5) * 5;
const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);
const soma = <T extends { qtd: number }>(l: T[]) => l.reduce((s, x) => s + x.qtd, 0);

export const totalGrelhas = (m: Montagem) => soma(m.grelhas);
export const totalEspetos = (m: Montagem) => soma(m.espetos);

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

/** Medidas de grelha e espeto que servem nesta boca (base para linhas novas). */
export function medidasSugeridas(a: number, b: number) {
  const s = encaixar(MEDIDAS.suporte, clamp(floor5(a), A_MIN, A_MAX));
  const g = grelhasDoSuporte(s);
  const comp = clamp(comprimentoGrelhaCm(clamp(floor5(b), 40, 70)), 35, 55);
  return {
    suporte: s,
    grelhaLargura: g.uruguaia,
    grelhaComprimento: comp,
    descanso: g.descanso,
    descansoQtd: g.descansoQtd,
    espeto: encaixarAcima(MEDIDAS.espeto, comp + 25),
  };
}

/** Peças sugeridas para a medida: o equivalente ao kit, montado peça a peça. */
export function montagemSugerida(a: number, b: number): Montagem {
  const md = medidasSugeridas(a, b);
  return {
    suporte: { on: true, larguraCm: md.suporte },
    grelhas: [
      {
        tipo: "uruguaia",
        larguraCm: md.grelhaLargura,
        comprimentoCm: md.grelhaComprimento,
        qtd: 2,
      },
    ],
    descanso: { qtd: md.descansoQtd, larguraCm: md.descanso },
    espetos: [{ tipo: "espeto_duplo", comprimentoCm: md.espeto, qtd: 2 }],
  };
}

/** Quantas peças de cada cabem no suporte (3 níveis, até 2 grelhas por nível). */
export function capacidade(m: Montagem) {
  const s = m.suporte.larguraCm;
  const maisLarga = Math.max(0, ...m.grelhas.map((g) => g.larguraCm));
  const nivelGrelha = 3 - (m.descanso.qtd > 0 ? 1 : 0);
  return {
    grelhas: maisLarga * 2 <= s ? nivelGrelha * 2 : nivelGrelha,
    descanso: totalGrelhas(m) > 4 ? 0 : m.descanso.larguraCm * 2 <= s ? 2 : 1,
    espetos: MAX_ESPETOS,
  };
}

/** Tira do fim da lista o que passou do limite. */
function cortar<T extends { qtd: number }>(l: T[], max: number) {
  let sobra = soma(l) - max;
  for (let i = l.length - 1; i >= 0 && sobra > 0; i--) {
    const tira = Math.min(l[i].qtd, sobra);
    l[i].qtd -= tira;
    sobra -= tira;
  }
}

/** Ajusta quantidades que deixaram de caber e junta linhas iguais. */
export function normalizar(m: Montagem): Montagem {
  const out: Montagem = JSON.parse(JSON.stringify(m));
  const juntar = <T extends { qtd: number }>(l: T[], chave: (x: T) => string) => {
    const mapa = new Map<string, T>();
    for (const x of l) {
      const k = chave(x);
      const ja = mapa.get(k);
      if (ja) ja.qtd += x.qtd;
      else mapa.set(k, { ...x });
    }
    return [...mapa.values()];
  };
  out.grelhas = juntar(out.grelhas, (g) => `${g.tipo}|${g.larguraCm}|${g.comprimentoCm}`);
  out.espetos = juntar(out.espetos, (e) => `${e.tipo}|${e.comprimentoCm}`);
  out.descanso.qtd = clamp(out.descanso.qtd, 0, capacidade(out).descanso);
  cortar(out.grelhas, capacidade(out).grelhas);
  cortar(out.espetos, MAX_ESPETOS);
  // linha zerada some, mas sempre fica uma linha de cada para o cliente editar
  out.grelhas = out.grelhas.filter((g, i) => g.qtd > 0 || i === 0);
  out.espetos = out.espetos.filter((e, i) => e.qtd > 0 || i === 0);
  return out;
}

/** Uma entrada por peça física, na ordem em que o 3D posiciona. */
export function grelhasPorPeca(m: Montagem) {
  return m.grelhas.flatMap((g) => Array.from({ length: g.qtd }, () => g));
}
export function espetosPorPeca(m: Montagem) {
  return m.espetos.flatMap((e) => Array.from({ length: e.qtd }, () => e));
}

export function composicaoMontagem(m: Montagem, b: number): Composicao {
  const gs = grelhasPorPeca(m);
  const es = espetosPorPeca(m);
  const maisLarga = Math.max(0, ...gs.map((g) => g.larguraCm));
  const maisComprida = Math.max(0, ...gs.map((g) => g.comprimentoCm));
  const porNivel = maisLarga * 2 <= m.suporte.larguraCm ? 2 : 1;
  return {
    suporteLarguraCm: m.suporte.larguraCm,
    niveis: 3,
    uruguaia: {
      larguraCm: gs.length ? maisLarga : 0,
      comprimentoCm: gs.length ? maisComprida : 0,
      porNivel,
      quantidade: gs.length,
    },
    descanso: m.descanso.qtd
      ? { larguraCm: m.descanso.larguraCm, quantidade: m.descanso.qtd }
      : null,
    espetos: {
      tipo: "simples",
      comprimentoCm: es.length ? Math.max(...es.map((e) => e.comprimentoCm)) : 0,
      quantidade: es.length,
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
  if (parte.startsWith("grelha_uruguaia") || parte.startsWith("grelha_argentina")) return "grelhas";
  if (parte.startsWith("grelha_descanso")) return "descanso";
  if (parte.startsWith("espeto")) return "espetos";
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
  const ref = m.grelhas[0];
  const gw = ref.larguraCm / 100;
  const gd = ref.comprimentoCm / 100;
  const porNivel = gw * 2 <= W ? 2 : 1;
  const ng = totalGrelhas(m);
  if (ng < cap.grelhas) {
    const folga = Math.max(W - porNivel * gw, 0.02);
    const unit = folga / (porNivel + 1);
    const nivel = Math.floor(ng / porNivel);
    const x = -W / 2 + unit + gw / 2 + (ng % porNivel) * (gw + unit);
    out.push({
      grupo: "grelhas",
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
  if (totalEspetos(m) < cap.espetos) {
    out.push({
      grupo: "espetos",
      rotulo: "Espeto",
      pos: [W * 0.32, ALTURAS[0] + 0.03, FRAME_Z + 0.42],
    });
  }
  return out;
}

export type ItemResumo = { peca: Peca; sku: string; rotulo: string; grupo: Grupo };

export function pecasDaMontagem(m: Montagem): ItemResumo[] {
  const lista: [Peca, Grupo][] = [];
  if (m.suporte.on)
    lista.push([{ tipo: "suporte", larguraCm: m.suporte.larguraCm, qtd: 1 }, "suporte"]);
  for (const g of m.grelhas)
    if (g.qtd)
      lista.push([
        { tipo: g.tipo, larguraCm: g.larguraCm, comprimentoCm: g.comprimentoCm, qtd: g.qtd },
        "grelhas",
      ]);
  if (m.descanso.qtd)
    lista.push([
      { tipo: "descanso", larguraCm: m.descanso.larguraCm, qtd: m.descanso.qtd },
      "descanso",
    ]);
  for (const e of m.espetos)
    if (e.qtd) lista.push([{ tipo: e.tipo, larguraCm: e.comprimentoCm, qtd: e.qtd }, "espetos"]);
  return lista.flatMap(([p, grupo]) => {
    const sku = skuPeca(p);
    return sku ? [{ peca: p, sku, rotulo: descreverPeca(p), grupo }] : [];
  });
}

/** O que vem no Kit Premium da faixa (para a lista "vem no kit"). */
/** Uma linha do Kit Premium: nome, medida e a parte do 3D que ela acende. */
export type LinhaKit = { peca: string; nome: string; medida: string };

/** As seis linhas do Kit Premium, na ordem da LP (1 espeto duplo + 1 simples). */
export function linhasKit(c: Composicao): LinhaKit[] {
  const l: LinhaKit[] = [
    { peca: "suporte", nome: "Suporte suspenso", medida: `${c.suporteLarguraCm} cm · 3 níveis` },
    {
      peca: "grelha_uruguaia",
      nome: `${c.uruguaia.quantidade} grelhas uruguaias`,
      medida: `${c.uruguaia.larguraCm}×${c.uruguaia.comprimentoCm} cm`,
    },
    { peca: "espeto_duplo", nome: "Espeto duplo", medida: `${c.espetos.comprimentoCm} cm` },
    { peca: "espeto_chata", nome: "Espeto simples", medida: `${c.espetos.comprimentoCm} cm` },
  ];
  if (c.descanso)
    l.push({
      peca: "grelha_descanso",
      nome:
        c.descanso.quantidade > 1
          ? `${c.descanso.quantidade} grelhas auxiliares`
          : "Grelha auxiliar",
      medida: `${c.descanso.larguraCm} cm`,
    });
  l.push({ peca: "pes", nome: "Pés de fixação", medida: `${c.peCm} cm · buchas e parafusos` });
  return l;
}

/** O kit em frases, para o leitor de tela. */
export function conteudoKit(c: Composicao, cooktop = false) {
  const l = linhasKit(c).map((x) => `${x.nome} ${x.medida}`);
  if (cooktop) l[l.length - 1] = "Encaixe cooktop: apoia na bancada, sem furar a parede";
  return l;
}

export { skuKit };
