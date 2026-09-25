import { supabase } from "./supabase";
import type { CatalogItem, PriceRow, QuoteInput, StoreSettings } from "./pricing";

const FUNCTIONS_URL = "https://pwpfpseatkwluahjqclc.supabase.co/functions/v1";
const SUPABASE_KEY = "sb_publishable_wubznX7fTM8oRiJK1vAf3A_LBZVVGzd";

/** Chave PÚBLICA do Mercado Pago (Credenciais > Produção > Public key). Sem ela o checkout mostra o WhatsApp. */
export const MP_PUBLIC_KEY: string =
  (import.meta.env.VITE_MP_PUBLIC_KEY as string | undefined) ?? "";

export type StoreData = { catalog: CatalogItem[]; prices: PriceRow[]; settings: StoreSettings };

let cache: Promise<StoreData | null> | null = null;

export function loadStore(force = false): Promise<StoreData | null> {
  if (cache && !force) return cache;
  cache = (async () => {
    try {
      const [c, p, s] = await Promise.all([
        supabase.from("catalog_items").select("*").eq("active", true).order("sort"),
        supabase.from("price_table").select("item_id,width_cm,depth_cm,price_cents"),
        supabase.from("store_settings").select("*").eq("id", 1).single(),
      ]);
      if (c.error || p.error || s.error || !c.data?.length)
        return import.meta.env.DEV ? devFallback() : null;
      return {
        catalog: c.data as CatalogItem[],
        prices: p.data as PriceRow[],
        settings: s.data as StoreSettings,
      };
    } catch {
      return null;
    }
  })();
  return cache;
}

export type Customer = { nome: string; email: string; cpf: string; whatsapp: string };
export type Address = {
  cep: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
};

export type CreatedOrder = {
  order_id: string;
  number: number;
  token: string;
  lines: {
    item_id: string;
    name: string;
    size: string;
    qty: number;
    unit_cents: number;
    total_cents: number;
  }[];
  subtotal_cents: number;
  shipping_cents: number;
  total_cents: number;
  pix_total_cents: number;
  max_installments: number;
};

export type PaymentView = {
  order_id: string;
  number: number;
  status: string;
  payment_method: "pix" | "card" | "boleto" | null;
  mp_status: string | null;
  mp_status_detail: string | null;
  total_cents: number;
  pix_total_cents: number;
  paid_cents: number | null;
  pix_qr: string | null;
  pix_qr_base64: string | null;
  pix_expires_at: string | null;
  boleto_url: string | null;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public reason?: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}

async function call<T>(fn: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${FUNCTIONS_URL}/${fn}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Sem conexão. Confira a internet e tente de novo.", 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new ApiError(
      data.error || "Algo falhou. Tente de novo.",
      res.status,
      data.reason,
      data.fields,
    );
  return data as T;
}

export function createOrder(payload: {
  quote: QuoteInput;
  customer: Customer;
  address: Address;
  notes?: string;
  session_id: string | null;
  visitor_id: string | null;
  utm: Record<string, string>;
}) {
  return call<CreatedOrder>("checkout-order", payload);
}

export function payOrder(payload: {
  order_id: string;
  token: string;
  method: "pix" | "card" | "boleto";
  card?: {
    token: string;
    payment_method_id: string;
    issuer_id?: string | number;
    installments: number;
  };
}) {
  return call<PaymentView>("checkout-pay", payload);
}

export async function getOrderStatus(id: string, token: string): Promise<PaymentView | null> {
  const { data, error } = await supabase.rpc("get_order_public", { p_id: id, p_token: token });
  if (error || !data) return null;
  return data as PaymentView;
}

export function currentUtm(): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    const saved = sessionStorage.getItem("onb_tracking");
    if (saved) Object.assign(out, JSON.parse(saved));
  } catch {
    /* sem storage */
  }
  const params = new URLSearchParams(window.location.search);
  [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
    "gclid",
    "gbraid",
    "fbclid",
  ].forEach((k) => {
    const v = params.get(k);
    if (v) out[k] = v;
  });
  return out;
}

/** Carrega o SDK v2 do Mercado Pago uma única vez. */
let sdk: Promise<unknown> | null = null;
export function loadMercadoPago(): Promise<unknown> {
  if (sdk) return sdk;
  sdk = new Promise((resolve, reject) => {
    const w = window as unknown as { MercadoPago?: unknown };
    if (w.MercadoPago) return resolve(w.MercadoPago);
    const s = document.createElement("script");
    s.src = "https://sdk.mercadopago.com/js/v2";
    s.async = true;
    s.onload = () => resolve((window as unknown as { MercadoPago: unknown }).MercadoPago);
    s.onerror = () => {
      sdk = null;
      reject(new Error("Não foi possível carregar o Mercado Pago"));
    };
    document.head.appendChild(s);
  });
  return sdk;
}

/** Só em desenvolvimento, antes de a migração rodar: os mesmos dados do seed SQL. */
function devFallback(): StoreData {
  const kit: [number, number, number][] = [
    [50, 40, 345529],
    [50, 45, 348946],
    [50, 50, 350975],
    [50, 55, 353371],
    [50, 60, 353371],
    [50, 65, 353371],
    [50, 70, 353371],
    [55, 40, 352761],
    [55, 45, 356178],
    [55, 50, 358207],
    [55, 55, 360603],
    [55, 60, 360603],
    [55, 65, 360603],
    [55, 70, 360603],
    [60, 40, 369117],
    [60, 45, 376688],
    [60, 50, 385431],
    [60, 55, 394539],
    [60, 60, 394539],
    [60, 65, 394539],
    [60, 70, 394539],
    [65, 40, 373213],
    [65, 45, 380784],
    [65, 50, 389527],
    [65, 55, 398635],
    [65, 60, 398635],
    [65, 65, 398635],
    [65, 70, 398635],
    [70, 40, 382930],
    [70, 45, 390501],
    [70, 50, 399244],
    [70, 55, 408352],
    [70, 60, 408352],
    [70, 65, 408352],
    [70, 70, 408352],
    [75, 40, 387025],
    [75, 45, 394596],
    [75, 50, 403339],
    [75, 55, 412447],
    [75, 60, 412447],
    [75, 65, 412447],
    [75, 70, 412447],
    [80, 40, 436848],
    [80, 45, 445865],
    [80, 50, 455936],
    [80, 55, 466358],
    [80, 60, 466358],
    [80, 65, 466358],
    [80, 70, 466358],
    [85, 40, 440940],
    [85, 45, 449957],
    [85, 50, 460028],
    [85, 55, 470450],
    [85, 60, 470450],
    [85, 65, 470450],
    [85, 70, 470450],
    [90, 40, 457949],
    [90, 45, 464990],
    [90, 50, 479119],
    [90, 55, 490541],
    [90, 60, 490541],
    [90, 65, 490541],
    [90, 70, 490541],
    [95, 40, 469175],
    [95, 45, 476216],
    [95, 50, 490345],
    [95, 55, 491741],
    [95, 60, 491741],
    [95, 65, 491741],
    [95, 70, 491741],
  ];
  return {
    catalog: [
      {
        id: "kit_premium",
        name: "Kit Premium completo",
        summary: "",
        uses_depth: true,
        in_kit: false,
        size_kind: "boca",
        active: true,
        sort: 0,
      },
      {
        id: "suporte_suspenso",
        name: "Suporte Suspenso",
        summary: "Fixado no fundo, frente livre, níveis de altura (35 cm de altura)",
        uses_depth: false,
        in_kit: true,
        size_kind: "L",
        active: true,
        sort: 1,
      },
      {
        id: "grelha_uruguaia",
        name: "Grelha Uruguaia Premium",
        summary: "Barras em V que escoam a gordura",
        uses_depth: true,
        in_kit: true,
        size_kind: "LxC",
        active: true,
        sort: 2,
      },
      {
        id: "grelha_descanso",
        name: "Grelha de Descanso",
        summary: "Mantém a carne aquecida sem passar do ponto",
        uses_depth: true,
        in_kit: true,
        size_kind: "LxC",
        active: true,
        sort: 3,
      },
      {
        id: "espeto_barra_chata",
        name: "Espeto Barra Chata",
        summary: "Barra maciça, ideal para cortes grandes",
        uses_depth: false,
        in_kit: true,
        size_kind: "comp",
        active: true,
        sort: 4,
      },
      {
        id: "espeto_v",
        name: "Espeto Simples em V",
        summary: "Perfil em V, segura linguiça e frango",
        uses_depth: false,
        in_kit: true,
        size_kind: "comp",
        active: true,
        sort: 5,
      },
    ],
    prices: [
      ...kit.map(([w, d, c]) => ({
        item_id: "kit_premium",
        width_cm: w,
        depth_cm: d,
        price_cents: c,
      })),
      ...DEV_PIECES,
    ],
    settings: {
      pix_discount_pct: 5,
      max_installments: 10,
      production_days: 10,
      free_shipping_ufs: ["PR", "SC", "RS", "SP", "RJ", "MG", "ES"],
      shipping_cents_by_uf: {},
      checkout_enabled: true,
    },
  };
}

// preenchido com os preços das peças avulsas coletados do site
const DEV_PIECES: PriceRow[] = [
  { item_id: "suporte_suspenso", width_cm: 45, depth_cm: 0, price_cents: 103617 },
  { item_id: "suporte_suspenso", width_cm: 50, depth_cm: 0, price_cents: 107713 },
  { item_id: "suporte_suspenso", width_cm: 55, depth_cm: 0, price_cents: 111808 },
  { item_id: "suporte_suspenso", width_cm: 60, depth_cm: 0, price_cents: 115896 },
  { item_id: "suporte_suspenso", width_cm: 65, depth_cm: 0, price_cents: 119992 },
  { item_id: "suporte_suspenso", width_cm: 70, depth_cm: 0, price_cents: 124084 },
  { item_id: "suporte_suspenso", width_cm: 75, depth_cm: 0, price_cents: 128179 },
  { item_id: "suporte_suspenso", width_cm: 80, depth_cm: 0, price_cents: 134024 },
  { item_id: "suporte_suspenso", width_cm: 85, depth_cm: 0, price_cents: 138116 },
  { item_id: "suporte_suspenso", width_cm: 90, depth_cm: 0, price_cents: 142211 },
  { item_id: "suporte_suspenso", width_cm: 95, depth_cm: 0, price_cents: 148461 },
  { item_id: "suporte_suspenso", width_cm: 100, depth_cm: 0, price_cents: 154711 },
  { item_id: "suporte_suspenso", width_cm: 105, depth_cm: 0, price_cents: 160961 },
  { item_id: "suporte_suspenso", width_cm: 110, depth_cm: 0, price_cents: 167211 },
  { item_id: "suporte_suspenso", width_cm: 115, depth_cm: 0, price_cents: 173461 },
  { item_id: "suporte_suspenso", width_cm: 120, depth_cm: 0, price_cents: 179711 },
  { item_id: "suporte_suspenso", width_cm: 125, depth_cm: 0, price_cents: 185961 },
  { item_id: "suporte_suspenso", width_cm: 130, depth_cm: 0, price_cents: 192211 },
  { item_id: "grelha_uruguaia", width_cm: 22, depth_cm: 35, price_cents: 68157 },
  { item_id: "grelha_uruguaia", width_cm: 22, depth_cm: 40, price_cents: 69000 },
  { item_id: "grelha_uruguaia", width_cm: 22, depth_cm: 45, price_cents: 70000 },
  { item_id: "grelha_uruguaia", width_cm: 22, depth_cm: 50, price_cents: 70500 },
  { item_id: "grelha_uruguaia", width_cm: 22, depth_cm: 55, price_cents: 71000 },
  { item_id: "grelha_uruguaia", width_cm: 27, depth_cm: 35, price_cents: 72025 },
  { item_id: "grelha_uruguaia", width_cm: 27, depth_cm: 40, price_cents: 73890 },
  { item_id: "grelha_uruguaia", width_cm: 27, depth_cm: 45, price_cents: 76967 },
  { item_id: "grelha_uruguaia", width_cm: 27, depth_cm: 50, price_cents: 80824 },
  { item_id: "grelha_uruguaia", width_cm: 27, depth_cm: 55, price_cents: 84680 },
  { item_id: "grelha_uruguaia", width_cm: 32, depth_cm: 35, price_cents: 72025 },
  { item_id: "grelha_uruguaia", width_cm: 32, depth_cm: 40, price_cents: 73890 },
  { item_id: "grelha_uruguaia", width_cm: 32, depth_cm: 45, price_cents: 76967 },
  { item_id: "grelha_uruguaia", width_cm: 32, depth_cm: 50, price_cents: 80824 },
  { item_id: "grelha_uruguaia", width_cm: 32, depth_cm: 55, price_cents: 84680 },
  { item_id: "grelha_uruguaia", width_cm: 37, depth_cm: 35, price_cents: 77135 },
  { item_id: "grelha_uruguaia", width_cm: 37, depth_cm: 40, price_cents: 79000 },
  { item_id: "grelha_uruguaia", width_cm: 37, depth_cm: 45, price_cents: 82800 },
  { item_id: "grelha_uruguaia", width_cm: 37, depth_cm: 50, price_cents: 87321 },
  { item_id: "grelha_uruguaia", width_cm: 37, depth_cm: 55, price_cents: 91834 },
  { item_id: "grelha_uruguaia", width_cm: 40, depth_cm: 35, price_cents: 81103 },
  { item_id: "grelha_uruguaia", width_cm: 40, depth_cm: 40, price_cents: 82969 },
  { item_id: "grelha_uruguaia", width_cm: 40, depth_cm: 45, price_cents: 85781 },
  { item_id: "grelha_uruguaia", width_cm: 40, depth_cm: 50, price_cents: 92331 },
  { item_id: "grelha_uruguaia", width_cm: 40, depth_cm: 55, price_cents: 97344 },
  { item_id: "grelha_uruguaia", width_cm: 50, depth_cm: 35, price_cents: 90178 },
  { item_id: "grelha_uruguaia", width_cm: 50, depth_cm: 40, price_cents: 92043 },
  { item_id: "grelha_uruguaia", width_cm: 50, depth_cm: 45, price_cents: 96012 },
  { item_id: "grelha_uruguaia", width_cm: 50, depth_cm: 50, price_cents: 103834 },
  { item_id: "grelha_uruguaia", width_cm: 50, depth_cm: 55, price_cents: 109999 },
  { item_id: "grelha_descanso", width_cm: 27, depth_cm: 20, price_cents: 45000 },
  { item_id: "grelha_descanso", width_cm: 32, depth_cm: 20, price_cents: 47000 },
  { item_id: "grelha_descanso", width_cm: 37, depth_cm: 20, price_cents: 49984 },
  { item_id: "grelha_descanso", width_cm: 40, depth_cm: 20, price_cents: 52472 },
  { item_id: "grelha_descanso", width_cm: 44, depth_cm: 20, price_cents: 54960 },
  { item_id: "grelha_descanso", width_cm: 50, depth_cm: 20, price_cents: 58097 },
  { item_id: "grelha_descanso", width_cm: 54, depth_cm: 20, price_cents: 60585 },
  { item_id: "grelha_descanso", width_cm: 64, depth_cm: 20, price_cents: 66210 },
  { item_id: "espeto_barra_chata", width_cm: 60, depth_cm: 0, price_cents: 23430 },
  { item_id: "espeto_barra_chata", width_cm: 65, depth_cm: 0, price_cents: 24287 },
  { item_id: "espeto_barra_chata", width_cm: 70, depth_cm: 0, price_cents: 25149 },
  { item_id: "espeto_barra_chata", width_cm: 75, depth_cm: 0, price_cents: 25999 },
  { item_id: "espeto_barra_chata", width_cm: 80, depth_cm: 0, price_cents: 26857 },
  { item_id: "espeto_v", width_cm: 60, depth_cm: 0, price_cents: 23429 },
  { item_id: "espeto_v", width_cm: 65, depth_cm: 0, price_cents: 24287 },
  { item_id: "espeto_v", width_cm: 70, depth_cm: 0, price_cents: 25149 },
  { item_id: "espeto_v", width_cm: 75, depth_cm: 0, price_cents: 25999 },
  { item_id: "espeto_v", width_cm: 80, depth_cm: 0, price_cents: 26857 },
];
