import { supabase } from "./supabase";

declare global {
  // eslint-disable-next-line no-var
  var fbq: ((...args: unknown[]) => void) | undefined;
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

  let leadId: string | null = null;
  try {
    const { data, error } = await supabase
      .from("leads")
      .insert({
        nome: lead.nome || "",
        whatsapp: lead.whatsapp || "",
        email: lead.email || "",
        cidade: lead.cidade || "",
        estado: lead.estado || "",
        estagio: lead.estagio || "",
        tipo_projeto: lead.tipoProjeto || "",
        foto_url: lead.fotoUrl || "",
        origem_captura: origem,
        clicked_whatsapp: false,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "",
        page_url: typeof window !== "undefined" ? window.location.href : "",
        ...utm,
      })
      .select("id")
      .single();
    if (error) {
      console.error("Supabase insert lead error:", error);
    } else {
      leadId = (data as { id: string } | null)?.id ?? null;
    }
  } catch (err) {
    console.error("Supabase insert lead exception:", err);
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
