import { supabase } from "./supabase";
import { getTrackingIds, track } from "./tracking";

declare global {
  // eslint-disable-next-line no-var
  var fbq: ((...args: unknown[]) => void) | undefined;
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

export type LeadOrigem = "chat_whatsapp" | "formulario";

export type LeadData = {
  nome: string;
  whatsapp: string;
  email?: string;
  cep: string;
  cidade?: string;
  estado?: string;
  estagio?: string;
  tipoProjeto?: string;
  fotoUrl?: string;
};

const WEBHOOK_URL =
  "https://api.datacrazy.io/v1/crm/api/crm/flows/webhooks/57af109b-a833-4f35-8081-b5ee5109d305/dc8467f8-72d4-4382-88e9-4fdb14aef590";

const formatPhone = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("55")) return digits;
  return "55" + digits;
};

const normalize = (v: string) => v.trim().toLowerCase();

let leadFired = false;
let leadPushed = false;

function newEventId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "lead-" + Date.now() + "-" + Math.random().toString(36).slice(2, 10);
}

/** UUID v4 gerado no navegador — o id do lead nasce no cliente, sem precisar ler de volta do banco. */
export function newLeadId(): string {
  const c: Crypto = globalThis.crypto;
  if (typeof c.randomUUID === "function") return c.randomUUID();
  const b = new Uint8Array(16);
  c.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const TRACK_KEYS = [
  "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
  "gclid", "gbraid", "wbraid", "fbclid",
];

function getTracking(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const out: Record<string, string> = {};
  const params = new URLSearchParams(window.location.search);
  let achou = false;
  TRACK_KEYS.forEach((k) => {
    const v = params.get(k);
    if (v) { out[k] = v; achou = true; }
  });
  try {
    if (achou) {
      sessionStorage.setItem("onb_tracking", JSON.stringify(out));
      return out;
    }
    const salvo = sessionStorage.getItem("onb_tracking");
    if (salvo) return JSON.parse(salvo);
  } catch (e) { /* sessionStorage indisponivel */ }
  return out;
}

export async function sendLeadToDataCrazy(
  lead: LeadData,
  origem: LeadOrigem,
): Promise<string | null> {
  const t = getTracking();
  const payload = {
    whatsapp: lead.whatsapp || "",
    email: lead.email || "",
    nome: lead.nome || "",
    churrasqueira: lead.estagio || "",
    projeto: lead.tipoProjeto || "",
    prazo: "Agora",
    investimento: "",
    cep: lead.cep || "",
    estado: lead.estado || "",
    fotoUrl: lead.fotoUrl || "",
    origem_captura: origem,
    utm_source: t.utm_source || "direct",
    utm_medium: t.utm_medium || "",
    utm_campaign: t.utm_campaign || "",
    utm_content: t.utm_content || "",
    utm_term: t.utm_term || "",
    gclid: t.gclid || "",
    gbraid: t.gbraid || "",
    wbraid: t.wbraid || "",
    fbclid: t.fbclid || "",
    referrer: typeof document !== "undefined" ? document.referrer : "",
    landing_url: typeof window !== "undefined" ? window.location.href : "",
  };
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) console.warn("[crm] status", res.status);
  } catch (err) {
    console.error("DataCrazy webhook error:", err);
  }

  // O lead já é salvo no Supabase por upsertLead() (RPC save_lead).
  // Não inserir de novo aqui para não duplicar linhas no painel.

  if (!leadFired && typeof window !== "undefined" && typeof fbq !== "undefined") {
    leadFired = true;
    const nameParts = (lead.nome || "").trim().split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";
    fbq("init", "560384575766988", {
      ph: formatPhone(lead.whatsapp),
      fn: normalize(firstName),
      ln: normalize(lastName),
      zp: (lead.cep || "").replace(/\D/g, ""),
      country: "br",
      external_id: formatPhone(lead.whatsapp),
    });
    fbq("track", "Lead", {
      content_name: "LP Premium - Kit Suporte Suspenso",
      content_category: lead.tipoProjeto || "Kit completo",
      value: 3500,
      currency: "BRL",
    });
  }

  if (!leadPushed && typeof window !== "undefined") {
    leadPushed = true;
    const partes = (lead.nome || "").trim().split(" ");
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: "generate_lead",
      lead_id: newEventId(),
      lead_origem: origem,
      lead_tipo_projeto: lead.tipoProjeto || "",
      lead_cep: lead.cep || "",
      lead_estado: lead.estado || "",
      lead_currency: "BRL",
      user_data: {
        email: (lead.email || "").trim().toLowerCase(),
        phone_number: "+" + formatPhone(lead.whatsapp),
        address: {
          first_name: (partes[0] || "").trim().toLowerCase(),
          last_name: (partes.slice(1).join(" ") || "").trim().toLowerCase(),
          postal_code: (lead.cep || "").replace(/\D/g, ""),
          region: (lead.estado || "").trim().toLowerCase(),
          country: "BR",
        },
      },
    });
  }

  return null;
}

export async function markWhatsappClick(leadId: string | null) {
  await markWhatsappClicked(leadId);
}

function getUtmParams() {
  if (typeof window === "undefined") {
    return { utm_source: "", utm_medium: "", utm_campaign: "", utm_content: "" };
  }
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get("utm_source") || "",
    utm_medium: params.get("utm_medium") || "",
    utm_campaign: params.get("utm_campaign") || "",
    utm_content: params.get("utm_content") || "",
  };
}

/**
 * Insere um lead parcial (fire-and-forget) ou atualiza um lead existente.
 * Nunca lança — retorna o ID quando conseguir persistir.
 */
export async function upsertLead(
  lead: LeadData,
  origem: LeadOrigem,
  existingId: string | null,
  opts?: { clickedWhatsapp?: boolean },
): Promise<string | null> {
  const clicked = opts?.clickedWhatsapp === true;
  const patch: Record<string, unknown> = {
    nome: lead.nome || "",
    whatsapp: lead.whatsapp || "",
    email: lead.email || "",
    cidade: lead.cidade || "",
    estado: lead.estado || "",
    estagio: lead.estagio || "",
    tipo_projeto: lead.tipoProjeto || "",
    foto_url: lead.fotoUrl || "",
    origem_captura: origem,
  };
  if (clicked) {
    patch.clicked_whatsapp = true;
    patch.clicked_whatsapp_at = new Date().toISOString();
  }

  const id = existingId ?? newLeadId();
  const data: Record<string, unknown> = {
    ...patch,
    user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    page_url: typeof window !== "undefined" ? window.location.href : "",
    ...getUtmParams(),
    cep: lead.cep || "",
    ...getTrackingIds(),
  };

  try {
    // RPC security definer: grava/atualiza sem precisar de SELECT para o anon
    // (o insert().select() antigo exigia SELECT e gerava o 401/403).
    const { error } = await supabase.rpc("save_lead", { p_id: id, p_data: data });
    if (error) {
      console.error("[saveLead] ERRO:", error.code, error.message, error.details, error.hint);
      return existingId;
    }
    track("lead_saved", { origem, tem_whatsapp: !!lead.whatsapp });
    return id;
  } catch (err) {
    console.error("[saveLead] ERRO inesperado:", err);
    return existingId;
  }
}

export function trackWhatsappClick(local: string, url?: string) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: "whatsapp_click",
    wa_local: local,
    wa_url: url || "",
  });
}

export async function markWhatsappClicked(leadId: string | null) {
  if (!leadId) return;
  const { error } = await supabase.rpc("save_lead", {
    p_id: leadId,
    p_data: { clicked_whatsapp: true, clicked_whatsapp_at: new Date().toISOString() },
  });
  if (error) console.warn("[leads] update clique falhou:", error.message);
}
