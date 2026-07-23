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
  cidade: string;
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

export async function sendLeadToDataCrazy(
  lead: LeadData,
  origem: LeadOrigem,
): Promise<{ leadId: string | null }> {
  const params = new URLSearchParams(window.location.search);
  const utm = {
    utm_source: params.get("utm_source") || "direct",
    utm_medium: params.get("utm_medium") || "",
    utm_campaign: params.get("utm_campaign") || "",
    utm_content: params.get("utm_content") || "",
  };
  const payload = {
    whatsapp: lead.whatsapp || "",
    email: lead.email || "",
    nome: lead.nome || "",
    churrasqueira: lead.estagio || "",
    projeto: lead.tipoProjeto || "",
    prazo: "Agora",
    investimento: "",
    cidade: lead.cidade || "",
    estado: lead.estado || "",
    fotoUrl: lead.fotoUrl || "",
    origem_captura: origem,
    ...utm,
  };
  console.log("Enviando para DataCrazy:", JSON.stringify(payload));
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

  const leadId: string | null = null;

  if (!leadFired && typeof window !== "undefined" && typeof fbq !== "undefined") {
    leadFired = true;
    const nameParts = (lead.nome || "").trim().split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";
    fbq("init", "560384575766988", {
      ph: formatPhone(lead.whatsapp),
      fn: normalize(firstName),
      ln: normalize(lastName),
      ct: normalize(lead.cidade || ""),
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

  return { leadId };
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
