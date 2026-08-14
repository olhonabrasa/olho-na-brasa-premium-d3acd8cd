import { supabase } from "./supabase";

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
  console.log("Lead enviado:", payload.origem_captura, payload.utm_campaign);
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    console.log("DataCrazy response:", res.status);
  } catch (err) {
    console.error("DataCrazy webhook error:", err);
  }

  let leadId: string | null = null;
  if (typeof window !== "undefined") {
    try {
      const params2 = new URLSearchParams(window.location.search);
      const { data: inserted, error: insErr } = await supabase
        .from("leads")
        .insert({
          nome: lead.nome || null,
          whatsapp: lead.whatsapp || null,
          email: lead.email || null,
          cidade: lead.cidade || null,
          estado: lead.estado || null,
          estagio: lead.estagio || null,
          tipo_projeto: lead.tipoProjeto || null,
          foto_url: lead.fotoUrl || null,
          origem_captura: origem,
          utm_source: params2.get("utm_source") || "direct",
          utm_medium: params2.get("utm_medium") || null,
          utm_campaign: params2.get("utm_campaign") || null,
          utm_content: params2.get("utm_content") || null,
          page_url: window.location.href,
          user_agent: navigator.userAgent,
        })
        .select("id")
        .single();
      if (insErr) console.warn("[leads] insert falhou:", insErr.message);
      else leadId = (inserted as { id: string } | null)?.id ?? null;
    } catch (e) {
      console.warn("[leads] insert exception:", e);
    }
  }

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

  return leadId;
}

export async function markWhatsappClick(leadId: string | null) {
  if (!leadId) return;
  try {
    const { error } = await supabase
      .from("leads")
      .update({ clicked_whatsapp: true, clicked_whatsapp_at: new Date().toISOString() })
      .eq("id", leadId);
    if (error) console.error("markWhatsappClick error:", error);
  } catch (err) {
    console.error("markWhatsappClick exception:", err);
  }
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

  console.log("[saveLead] Iniciando insert/update no Supabase...", {
    nome: lead.nome,
    whatsapp: lead.whatsapp,
    existingId,
    clickedWhatsapp: clicked,
  });

  try {
    if (existingId) {
      const { error } = await supabase.from("leads").update(patch).eq("id", existingId);
      if (error) {
        console.error("[saveLead] ERRO no update:", error.message, error.details, error.hint);
        return existingId;
      }
      console.log("[saveLead] UPDATE OK, id:", existingId);
      return existingId;
    }
    const insertPayload = {
      ...patch,
      clicked_whatsapp: clicked,
      clicked_whatsapp_at: clicked ? new Date().toISOString() : null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      page_url: typeof window !== "undefined" ? window.location.href : "",
      ...getUtmParams(),
    };
    const { data, error } = await supabase
      .from("leads")
      .insert(insertPayload)
      .select("id")
      .single();
    if (error) {
      console.error("[saveLead] ERRO no insert:", error.message, error.details, error.hint);
      return null;
    }
    console.log("[saveLead] INSERT OK, id:", (data as { id: string } | null)?.id);
    return (data as { id: string } | null)?.id ?? null;
  } catch (err) {
    console.error("[saveLead] ERRO inesperado:", err);
    return null;
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
  try {
    await supabase
      .from("leads")
      .update({ clicked_whatsapp: true, clicked_whatsapp_at: new Date().toISOString() })
      .eq("id", leadId);
  } catch (e) {
    console.warn("[leads] update clique falhou:", e);
  }
}
