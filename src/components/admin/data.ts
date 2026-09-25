import { supabase } from "@/lib/supabase";

export type Session = {
  id: string;
  visitor_id: string;
  started_at: string;
  last_seen_at: string;
  landing_url: string | null;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  gclid: string | null;
  fbclid: string | null;
  device: string | null;
  os: string | null;
  browser: string | null;
  viewport_w: number | null;
  viewport_h: number | null;
  page_h: number | null;
  max_scroll_pct: number;
  active_ms: number;
  clicks: number;
  events: number;
  sections: Record<string, number>;
  furthest_section: string | null;
  configured: boolean;
  checkout_started: boolean;
  purchased: boolean;
  whatsapp_clicked: boolean;
  lead_id: string | null;
  order_id: string | null;
  ended_at: string | null;
};

export type Lead = {
  id: string;
  created_at: string;
  nome: string | null;
  whatsapp: string | null;
  email: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  estagio: string | null;
  tipo_projeto: string | null;
  foto_url: string | null;
  origem_captura: string | null;
  clicked_whatsapp: boolean | null;
  clicked_whatsapp_at: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  page_url: string | null;
  user_agent: string | null;
  session_id: string | null;
  visitor_id: string | null;
};

export type TrackEvent = {
  id: number;
  session_id: string;
  ts: string;
  t_ms: number | null;
  type: string;
  section: string | null;
  scroll_pct: number | null;
  x: number | null;
  y: number | null;
  data: Record<string, unknown> | null;
};

export type Order = {
  id: string;
  number: number;
  created_at: string;
  updated_at: string;
  status: string;
  mode: "kit" | "custom";
  width_cm: number;
  depth_cm: number;
  tier_width_cm: number;
  tier_depth_cm: number;
  items: {
    item_id: string;
    name: string;
    size?: string;
    qty: number;
    unit_cents: number;
    total_cents: number;
  }[];
  subtotal_cents: number;
  shipping_cents: number;
  total_cents: number;
  pix_total_cents: number;
  paid_cents: number | null;
  payment_method: string | null;
  installments: number | null;
  mp_payment_id: string | null;
  mp_status: string | null;
  mp_status_detail: string | null;
  customer: { nome: string; email: string; cpf: string; whatsapp: string };
  address: {
    cep: string;
    rua: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    uf: string;
  };
  notes: string | null;
  admin_notes: string | null;
  tracking_code: string | null;
  session_id: string | null;
  visitor_id: string | null;
  utm: Record<string, string> | null;
};

export const SECTION_LABELS: Record<string, string> = {
  hero: "Topo (vídeo)",
  diferenciais: "Diferenciais",
  antes_depois: "Antes e depois",
  configurador: "Configurador / preço",
  fabrica: "Fábrica",
  galeria: "Galeria",
  videos_clientes: "Vídeos de clientes",
  avaliacoes_google: "Avaliações Google",
  faq: "Perguntas",
  cta_final: "Chamada final",
  rodape: "Rodapé",
  checkout: "Checkout",
};
export const SECTION_ORDER = Object.keys(SECTION_LABELS);

export const EVENT_LABELS: Record<string, string> = {
  page_view: "Entrou na página",
  scroll_depth: "Rolou",
  section_view: "Viu a seção",
  click: "Clicou",
  whatsapp_click: "Clicou no WhatsApp",
  rage_click: "Cliques repetidos (frustração)",
  field_focus: "Entrou no campo",
  field_filled: "Preencheu o campo",
  video_play: "Deu play no vídeo",
  configurator_change: "Configurou medida",
  configurator_mode: "Trocou o modo",
  measure_guide: "Abriu o guia de medidas",
  checkout_open: "Abriu o checkout",
  checkout_step: "Etapa do checkout",
  checkout_order_created: "Pedido criado",
  checkout_error: "Erro no checkout",
  payment_method: "Escolheu pagamento",
  payment_created: "Gerou pagamento",
  pix_copy: "Copiou o Pix",
  purchase: "COMPROU",
  lead_saved: "Lead salvo",
  dock_click: "Botão fixo ‘ver preço’",
  page_hide: "Saiu / trocou de aba",
  page_return: "Voltou para a aba",
};

export const ORDER_STATUS: Record<
  string,
  { label: string; tone: "ok" | "warn" | "bad" | "info" | "muted" }
> = {
  aguardando_pagamento: { label: "Aguardando pagamento", tone: "warn" },
  em_analise: { label: "Em análise", tone: "info" },
  pago: { label: "Pago", tone: "ok" },
  em_producao: { label: "Em produção", tone: "info" },
  enviado: { label: "Enviado", tone: "info" },
  entregue: { label: "Entregue", tone: "ok" },
  recusado: { label: "Recusado", tone: "bad" },
  cancelado: { label: "Cancelado", tone: "muted" },
  reembolsado: { label: "Reembolsado", tone: "muted" },
};

export async function fetchSessions(fromIso: string) {
  const all: Session[] = [];
  for (let page = 0; page < 10; page++) {
    const { data, error } = await supabase
      .from("lp_sessions")
      .select("*")
      .gte("started_at", fromIso)
      .order("started_at", { ascending: false })
      .range(page * 1000, page * 1000 + 999);
    if (error) throw error;
    all.push(...((data as Session[]) ?? []));
    if (!data || data.length < 1000) break;
  }
  return all;
}

export async function fetchLeads(fromIso?: string) {
  let q = supabase.from("leads").select("*").order("created_at", { ascending: false }).limit(2000);
  if (fromIso) q = q.gte("created_at", fromIso);
  const { data, error } = await q;
  if (error) throw error;
  return (data as Lead[]) ?? [];
}

export async function fetchOrders() {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) throw error;
  return (data as Order[]) ?? [];
}

export async function fetchEvents(sessionId: string) {
  const { data, error } = await supabase
    .from("lp_events")
    .select("*")
    .eq("session_id", sessionId)
    .order("ts")
    .order("id")
    .limit(5000);
  if (error) throw error;
  return (data as TrackEvent[]) ?? [];
}

export async function fetchClicks(fromIso: string) {
  const { data, error } = await supabase
    .from("lp_events")
    .select("session_id,type,x,y,section,data,ts")
    .in("type", ["click", "whatsapp_click", "rage_click"])
    .gte("ts", fromIso)
    .not("y", "is", null)
    .order("ts", { ascending: false })
    .limit(8000);
  if (error) throw error;
  return (
    (data as Pick<TrackEvent, "session_id" | "type" | "x" | "y" | "section" | "data" | "ts">[]) ??
    []
  );
}

export function fmtDuration(ms: number) {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${String(s % 60).padStart(2, "0")}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

export function fmtDate(iso: string | null, withYear = false) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    ...(withYear ? { year: "2-digit" } : {}),
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function sourceOf(s: Pick<Session, "utm_source" | "referrer" | "gclid" | "fbclid">) {
  if (s.utm_source) return s.utm_source;
  if (s.gclid) return "google (gclid)";
  if (s.fbclid) return "meta (fbclid)";
  if (s.referrer) {
    try {
      const h = new URL(s.referrer).hostname.replace(/^www\./, "");
      if (/instagram/.test(h)) return "instagram";
      if (/facebook|fb\./.test(h)) return "facebook";
      if (/google\./.test(h)) return "google (orgânico)";
      return h;
    } catch {
      return "referência";
    }
  }
  return "direto";
}

export function waLink(whatsapp: string) {
  const d = whatsapp.replace(/\D/g, "");
  return `https://wa.me/${d.startsWith("55") && d.length >= 12 ? d : "55" + d}`;
}

export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const cols = Array.from(
    rows.reduce<Set<string>>(
      (acc, r) => (Object.keys(r).forEach((k) => acc.add(k)), acc),
      new Set(),
    ),
  );
  const esc = (v: unknown) => {
    const s =
      v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    // evita injeção de fórmula ao abrir no Excel
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
