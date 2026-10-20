// Catálogo da loja Wbuy (olhonabrasa.com.br): SKUs reais de cada peça e do
// Kit Premium, coletados das páginas de produto. O carrinho e o checkout da
// Wbuy recebem exatamente estes SKUs, então frete, estoque, cupom e pagamento
// continuam sendo os da loja.

/** Kit Premium: 5250835.219479.{largura}.{braseiro} */
const KIT_BASE = "5250835.219479";
const KIT_LARGURA: Record<number, number> = {
  50: 594832,
  55: 594833,
  60: 594855,
  65: 594856,
  70: 594857,
  75: 594858,
  80: 594859,
  85: 594860,
  90: 594861,
  95: 594862,
};
const KIT_BRASEIRO: Record<number, number> = {
  40: 278257,
  45: 289188,
  50: 278258,
  55: 289189,
  60: 262662,
  65: 294569,
  70: 262664,
};

// suporte de 3 níveis (a loja também tem 4 níveis, 501953–501972 e 503460; o 3D desenha 3)
const SUPORTE: Record<number, number> = {
  35: 501951,
  40: 501952,
  45: 445846,
  50: 257876,
  55: 257877,
  60: 257878,
  65: 257879,
  70: 257880,
  75: 266809,
  80: 266810,
  85: 266811,
  90: 266812,
  95: 406778,
  100: 269361,
  105: 454149,
  110: 454179,
  115: 454150,
  120: 269362,
  125: 454180,
  130: 454152,
  135: 503459,
};
const DESCANSO: Record<number, number> = {
  30: 503430,
  35: 503431,
  40: 454183,
  45: 503432,
  50: 257715,
  55: 503433,
  60: 503434,
  65: 503435,
};
const ESPETO: Record<number, number> = {
  60: 351799,
  65: 351800,
  70: 351801,
  75: 351802,
  80: 351803,
};
/** uruguaia[largura][comprimento] */
const URUGUAIA: Record<number, Record<number, number>> = {
  22: { 35: 453587, 40: 453588, 45: 453589, 50: 453590, 55: 446125 },
  27: { 35: 446130, 40: 446131, 45: 446132, 50: 446133, 55: 446134 },
  32: { 35: 446147, 40: 446148, 45: 446149, 50: 446150, 55: 446151 },
  37: { 35: 446164, 40: 446165, 45: 446166, 50: 446167, 55: 446168 },
  40: { 35: 446179, 40: 445981, 45: 445982, 50: 445983, 55: 445984 },
  50: { 35: 454187, 40: 445993, 45: 445994, 50: 445995, 55: 445866 },
  35: { 35: 503436, 40: 503437, 45: 503438, 50: 503439, 55: 503440 },
  42: { 35: 503441, 40: 503442, 45: 503443, 50: 503444, 55: 503445 },
  45: { 35: 503446, 40: 503447, 45: 503448, 50: 503449, 55: 503450 },
  55: { 35: 503451, 40: 503452, 45: 503453, 50: 503454, 55: 503455 },
};

export type PecaTipo =
  | "suporte"
  | "uruguaia"
  | "argentina"
  | "descanso"
  | "espeto_duplo"
  | "espeto_chata"
  | "espeto_v";

export const NOMES: Record<PecaTipo, string> = {
  suporte: "Suporte suspenso",
  uruguaia: "Grelha uruguaia",
  argentina: "Grelha argentina",
  descanso: "Grelha de descanso",
  espeto_duplo: "Espeto duplo",
  espeto_chata: "Espeto barra chata",
  espeto_v: "Espeto V",
};

export const MEDIDAS = {
  suporte: Object.keys(SUPORTE).map(Number),
  descanso: Object.keys(DESCANSO).map(Number),
  espeto: Object.keys(ESPETO).map(Number),
  uruguaiaLargura: Object.keys(URUGUAIA).map(Number),
  uruguaiaComprimento: [35, 40, 45, 50, 55],
};

export const KIT_A = Object.keys(KIT_LARGURA).map(Number);
export const KIT_B = Object.keys(KIT_BRASEIRO).map(Number);

export type Peca = {
  tipo: PecaTipo;
  /** largura em cm (comprimento do espeto) */
  larguraCm: number;
  /** só a uruguaia tem comprimento */
  comprimentoCm?: number;
  qtd: number;
};

export function skuKit(aFaixa: number, bFaixa: number): string | null {
  const l = KIT_LARGURA[aFaixa];
  const b = KIT_BRASEIRO[bFaixa];
  return l && b ? `${KIT_BASE}.${l}.${b}` : null;
}

export function skuPeca(p: Peca): string | null {
  switch (p.tipo) {
    case "suporte":
      return SUPORTE[p.larguraCm] ? `5046861.101891.0.${SUPORTE[p.larguraCm]}` : null;
    case "descanso":
      return DESCANSO[p.larguraCm] ? `5046898.100848.0.${DESCANSO[p.larguraCm]}` : null;
    case "espeto_duplo":
      return ESPETO[p.larguraCm] ? `4894689.100851.0.${ESPETO[p.larguraCm]}` : null;
    case "espeto_chata":
      return ESPETO[p.larguraCm] ? `4894682.100851.0.${ESPETO[p.larguraCm]}` : null;
    case "espeto_v":
      return ESPETO[p.larguraCm] ? `4896947.100851.0.${ESPETO[p.larguraCm]}` : null;
    case "argentina": {
      // mesma grade de medidas da uruguaia (a loja não tem a 22×35 na argentina)
      const v = URUGUAIA[p.larguraCm]?.[p.comprimentoCm ?? 0];
      return v && v !== 453587 ? `5751982.100848.0.${v}` : null;
    }
    case "uruguaia": {
      const v = URUGUAIA[p.larguraCm]?.[p.comprimentoCm ?? 0];
      return v ? `5047524.100848.0.${v}` : null;
    }
  }
}

/** Medida mais próxima disponível (para baixo, senão a menor). */
export function encaixar(lista: number[], v: number) {
  const ord = [...lista].sort((a, b) => a - b);
  let r = ord[0];
  for (const x of ord) if (x <= v) r = x;
  return r;
}

/** Medida mais próxima disponível (para cima, senão a maior). */
export function encaixarAcima(lista: number[], v: number) {
  const ord = [...lista].sort((a, b) => a - b);
  return ord.find((x) => x >= v) ?? ord[ord.length - 1];
}

export function descreverPeca(p: Peca) {
  if (p.tipo === "uruguaia" || p.tipo === "argentina")
    return `${NOMES[p.tipo]} ${p.larguraCm}×${p.comprimentoCm} cm`;
  return `${NOMES[p.tipo]} ${p.larguraCm} cm`;
}

/** Acessórios vendidos prontos (um SKU só, sem medida). */
export const ACESSORIOS = {
  giratorio: { sku: "2753580.100851.0", nome: "Kit espeto giratório", img: "peca-giratorio" },
  cesto: { sku: "5772953.101891.0", nome: "Cesto de miúdos", img: "cesto-miudos" },
  bandeja: { sku: "5126259.101891.0", nome: "Bandeja de coração", img: "bandeja-coracao" },
  defumador: { sku: "2269083.101891.0", nome: "Defumador", img: "peca-defumador" },
} as const;

/** Giratório + cesto juntos saem pelo combo da loja (mais barato que os dois separados). */
export const COMBO_GIRATORIO_CESTO = "5798902.365218.0";

/**
 * Encaixe cooktop ("Suporte suspenso Cooktop", produto 5214745 no painel).
 * CONFIRMAR com a fábrica: aqui ele entra como adicional ao suporte/kit escolhido.
 */
export const COOKTOP_SKU = "5214745.101891.0";
