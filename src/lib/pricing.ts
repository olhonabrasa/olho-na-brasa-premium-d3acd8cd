// Regras de preço do configurador. Módulo puro (sem imports) porque o MESMO
// arquivo roda no navegador e na Edge Function (supabase/functions/_shared/pricing.ts).
// O servidor sempre recalcula: o preço que o navegador mostra nunca é confiado.
//
// Mesma regra do global.js do Wbuy: a medida arredonda PARA BAIXO até a maior
// faixa fabricada que cabe (floorTier). Fora da faixa = sob medida pelo WhatsApp.

export type CatalogItem = {
  id: string;
  name: string;
  summary: string;
  uses_depth: boolean;
  in_kit: boolean;
  /** como o tamanho da peça é descrito: "LxC" (grelha), "L" (suporte), "comp" (espeto) */
  size_kind: "boca" | "LxC" | "L" | "comp";
  active: boolean;
  sort: number;
};

export type PriceRow = { item_id: string; width_cm: number; depth_cm: number; price_cents: number };

export type StoreSettings = {
  pix_discount_pct: number;
  max_installments: number;
  production_days: number;
  free_shipping_ufs: string[];
  shipping_cents_by_uf: Record<string, number>;
  checkout_enabled: boolean;
};

export type Piece = { item_id: string; width_cm: number; depth_cm: number; qty: number };

export type QuoteInput = {
  mode: "kit" | "custom";
  /** medida da churrasqueira informada pelo cliente (A = boca, B = comprimento) */
  width_cm: number;
  depth_cm: number;
  /** modo custom: cada peça no tamanho escolhido */
  pieces?: Piece[];
};

export type QuoteLine = {
  item_id: string;
  name: string;
  size: string;
  qty: number;
  unit_cents: number;
  total_cents: number;
  tier_width_cm: number;
  tier_depth_cm: number;
};

export type Quote =
  | {
      ok: true;
      mode: "kit" | "custom";
      width_cm: number;
      depth_cm: number;
      tier_width_cm: number;
      tier_depth_cm: number;
      lines: QuoteLine[];
      subtotal_cents: number;
      pix_subtotal_cents: number;
    }
  | {
      ok: false;
      reason: "fora_da_faixa" | "sem_preco" | "vazio";
      message: string;
      width_range?: [number, number];
      depth_range?: [number, number];
    };

export const KIT_ID = "kit_premium";
export const MAX_QTY = 6;
export const MAX_PIECES = 12;

/** maior valor da lista <= v; null se v estiver abaixo do menor */
export function floorTier(v: number, tiers: number[]): number | null {
  let r: number | null = null;
  for (const t of [...tiers].sort((a, b) => a - b)) {
    if (t <= v) r = t;
    else break;
  }
  return r;
}

export function uniqueSorted(values: number[]) {
  return [...new Set(values)].sort((a, b) => a - b);
}

export function widthsFor(prices: PriceRow[], itemId: string) {
  return uniqueSorted(prices.filter((p) => p.item_id === itemId).map((p) => p.width_cm));
}

export function depthsFor(prices: PriceRow[], itemId: string, width?: number) {
  return uniqueSorted(
    prices
      .filter((p) => p.item_id === itemId && (width == null || p.width_cm === width))
      .map((p) => p.depth_cm),
  );
}

/** Faixa aceita (min/max) por eixo, considerando o item de referência. */
export function measureRange(prices: PriceRow[], itemId: string) {
  const ws = widthsFor(prices, itemId);
  const ds = depthsFor(prices, itemId).filter((d) => d > 0);
  return {
    width: ws.length ? ([ws[0], ws[ws.length - 1] + 4] as [number, number]) : null,
    depth: ds.length ? ([ds[0], ds[ds.length - 1] + 4] as [number, number]) : null,
  };
}

/** Preço de 1 item para as medidas: procura a maior largura <= A e, se usa B, a maior profundidade <= B com preço. */
export function priceFor(
  prices: PriceRow[],
  item: Pick<CatalogItem, "id" | "uses_depth">,
  width: number,
  depth: number,
) {
  const ws = widthsFor(prices, item.id);
  const w = floorTier(width, ws);
  if (w == null) return null;
  // Acima da maior faixa (+4cm de tolerância) não fabricamos no padrão.
  if (width > ws[ws.length - 1] + 4) return null;
  if (!item.uses_depth) {
    const row = prices.find((p) => p.item_id === item.id && p.width_cm === w && p.depth_cm === 0);
    return row ? { price_cents: row.price_cents, tier_width_cm: w, tier_depth_cm: 0 } : null;
  }
  const ds = depthsFor(prices, item.id, w).filter((d) => d > 0);
  const all = depthsFor(prices, item.id).filter((d) => d > 0);
  if (!ds.length || !all.length) return null;
  if (depth > all[all.length - 1] + 4) return null;
  const d = floorTier(depth, ds);
  if (d == null) return null;
  const row = prices.find((p) => p.item_id === item.id && p.width_cm === w && p.depth_cm === d);
  return row ? { price_cents: row.price_cents, tier_width_cm: w, tier_depth_cm: d } : null;
}

export function pixCents(cents: number, pct: number) {
  return Math.round(cents * (1 - Math.min(Math.max(pct, 0), 30) / 100));
}

export function buildQuote(
  input: QuoteInput,
  catalog: CatalogItem[],
  prices: PriceRow[],
  settings: Pick<StoreSettings, "pix_discount_pct">,
): Quote {
  const width = Math.round(Number(input.width_cm));
  const depth = Math.round(Number(input.depth_cm));
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(depth) ||
    width < 20 ||
    width > 300 ||
    depth < 20 ||
    depth > 300
  ) {
    return { ok: false, reason: "fora_da_faixa", message: "Medidas inválidas." };
  }

  if (input.mode === "custom")
    return buildCustom(width, depth, input.pieces ?? [], catalog, prices, settings);

  const kit = catalog.find((c) => c.id === KIT_ID && c.active);
  if (!kit) return { ok: false, reason: "sem_preco", message: "Kit indisponível no momento." };
  const range = measureRange(prices, KIT_ID);
  const p = priceFor(prices, kit, width, depth);
  if (!p) {
    const outOfRange =
      (range.width && (width < range.width[0] || width > range.width[1])) ||
      (range.depth && (depth < range.depth[0] || depth > range.depth[1]));
    return {
      ok: false,
      reason: outOfRange ? "fora_da_faixa" : "sem_preco",
      message: outOfRange
        ? `${width} × ${depth} cm foge da faixa padrão. A gente fabrica sob medida.`
        : `Para ${width} × ${depth} cm o preço é feito pelo especialista.`,
      width_range: range.width ?? undefined,
      depth_range: range.depth ?? undefined,
    };
  }
  const line: QuoteLine = {
    item_id: kit.id,
    name: kit.name,
    size: `${p.tier_width_cm} × ${p.tier_depth_cm} cm`,
    qty: 1,
    unit_cents: p.price_cents,
    total_cents: p.price_cents,
    tier_width_cm: p.tier_width_cm,
    tier_depth_cm: p.tier_depth_cm,
  };
  return {
    ok: true,
    mode: "kit",
    width_cm: width,
    depth_cm: depth,
    tier_width_cm: p.tier_width_cm,
    tier_depth_cm: p.tier_depth_cm,
    lines: [line],
    subtotal_cents: line.total_cents,
    pix_subtotal_cents: pixCents(line.total_cents, settings.pix_discount_pct),
  };
}

export function sizeLabel(kind: CatalogItem["size_kind"], w: number, d: number) {
  if (kind === "LxC") return `${w} × ${d} cm`;
  if (kind === "comp") return `${w} cm`;
  return `${w} cm de largura`;
}

/** Tamanhos vendidos de uma peça (linhas da tabela), em ordem. */
export function sizesFor(prices: PriceRow[], itemId: string) {
  return prices
    .filter((p) => p.item_id === itemId)
    .sort((a, b) => a.width_cm - b.width_cm || a.depth_cm - b.depth_cm);
}

/** Sugestão de tamanho: suporte acompanha a largura da boca (maior <= A). */
export function suggestSize(prices: PriceRow[], item: CatalogItem, width: number) {
  const sizes = sizesFor(prices, item.id);
  if (!sizes.length) return null;
  if (item.size_kind === "L") {
    const w = floorTier(width, uniqueSorted(sizes.map((s) => s.width_cm)));
    return sizes.find((s) => s.width_cm === w) ?? null;
  }
  return null;
}

function buildCustom(
  width: number,
  depth: number,
  pieces: Piece[],
  catalog: CatalogItem[],
  prices: PriceRow[],
  settings: Pick<StoreSettings, "pix_discount_pct">,
): Quote {
  const lines: QuoteLine[] = [];
  let count = 0;
  for (const raw of pieces.slice(0, MAX_PIECES)) {
    const qty = Math.min(MAX_QTY, Math.floor(Number(raw?.qty)));
    if (!Number.isFinite(qty) || qty < 1) continue;
    const item = catalog.find((c) => c.id === raw.item_id && c.active && c.in_kit);
    if (!item) continue;
    const w = Math.round(Number(raw.width_cm));
    const d = Math.round(Number(raw.depth_cm));
    const row = prices.find((p) => p.item_id === item.id && p.width_cm === w && p.depth_cm === d);
    if (!row)
      return {
        ok: false,
        reason: "sem_preco",
        message: `Esse tamanho de ${item.name} é orçado pelo especialista.`,
      };
    count += qty;
    lines.push({
      item_id: item.id,
      name: item.name,
      size: sizeLabel(item.size_kind, w, d),
      qty,
      unit_cents: row.price_cents,
      total_cents: row.price_cents * qty,
      tier_width_cm: w,
      tier_depth_cm: d,
    });
  }
  if (!lines.length)
    return { ok: false, reason: "vazio", message: "Escolha ao menos uma peça e o tamanho." };
  if (count > MAX_PIECES * MAX_QTY)
    return {
      ok: false,
      reason: "vazio",
      message: "Quantidade muito alta. Fale com o especialista.",
    };
  const subtotal = lines.reduce((s, l) => s + l.total_cents, 0);
  return {
    ok: true,
    mode: "custom",
    width_cm: width,
    depth_cm: depth,
    tier_width_cm: width,
    tier_depth_cm: depth,
    lines,
    subtotal_cents: subtotal,
    pix_subtotal_cents: pixCents(subtotal, settings.pix_discount_pct),
  };
}

export const REGION_BY_UF: Record<
  string,
  "Sul" | "Sudeste" | "Centro-Oeste" | "Nordeste" | "Norte"
> = {
  PR: "Sul",
  SC: "Sul",
  RS: "Sul",
  SP: "Sudeste",
  RJ: "Sudeste",
  MG: "Sudeste",
  ES: "Sudeste",
  DF: "Centro-Oeste",
  GO: "Centro-Oeste",
  MT: "Centro-Oeste",
  MS: "Centro-Oeste",
  BA: "Nordeste",
  SE: "Nordeste",
  AL: "Nordeste",
  PE: "Nordeste",
  PB: "Nordeste",
  RN: "Nordeste",
  CE: "Nordeste",
  PI: "Nordeste",
  MA: "Nordeste",
  PA: "Norte",
  AP: "Norte",
  AM: "Norte",
  RR: "Norte",
  AC: "Norte",
  RO: "Norte",
  TO: "Norte",
};

/** null = frete não configurado para a UF (finaliza no WhatsApp) */
export function shippingFor(
  uf: string,
  settings: Pick<StoreSettings, "free_shipping_ufs" | "shipping_cents_by_uf">,
) {
  const u = (uf || "").toUpperCase();
  if (!REGION_BY_UF[u]) return null;
  if (settings.free_shipping_ufs.includes(u)) return 0;
  const v = settings.shipping_cents_by_uf?.[u];
  return typeof v === "number" && v >= 0 ? Math.round(v) : null;
}

export function brl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
