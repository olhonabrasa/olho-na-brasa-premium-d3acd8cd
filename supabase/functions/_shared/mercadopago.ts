// Cliente mínimo da API do Mercado Pago (v1/payments). Sem SDK: menos superfície.
const API = "https://api.mercadopago.com";

function token() {
  const t = Deno.env.get("MP_ACCESS_TOKEN");
  if (!t) throw new Error("MP_ACCESS_TOKEN não configurado");
  return t;
}

export type MpPayment = {
  id: number;
  status: string; // approved | pending | in_process | rejected | cancelled | refunded | charged_back | authorized
  status_detail: string;
  external_reference: string | null;
  transaction_amount: number;
  installments?: number;
  payment_method_id?: string;
  payment_type_id?: string;
  date_of_expiration?: string | null;
  point_of_interaction?: {
    transaction_data?: { qr_code?: string; qr_code_base64?: string; ticket_url?: string };
  };
  transaction_details?: { external_resource_url?: string };
};

export async function createPayment(
  body: Record<string, unknown>,
  idempotencyKey: string,
): Promise<MpPayment> {
  const res = await fetch(`${API}/v1/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = data?.cause?.[0]?.description || data?.message || `HTTP ${res.status}`;
    throw new Error(`Mercado Pago: ${msg}`);
  }
  return data as MpPayment;
}

export async function getPayment(id: string): Promise<MpPayment> {
  const res = await fetch(`${API}/v1/payments/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token()}` },
  });
  if (!res.ok) throw new Error(`Mercado Pago: pagamento ${id} HTTP ${res.status}`);
  return (await res.json()) as MpPayment;
}

/** status do MP -> status do pedido */
export function orderStatusFrom(mp: string) {
  switch (mp) {
    case "approved":
      return "pago";
    case "in_process":
    case "authorized":
      return "em_analise";
    case "rejected":
      return "recusado";
    case "cancelled":
      return "cancelado";
    case "refunded":
    case "charged_back":
      return "reembolsado";
    default:
      return "aguardando_pagamento";
  }
}

/**
 * Valida a assinatura do webhook (header x-signature: "ts=...,v1=...").
 * Manifesto oficial: id:{data.id};request-id:{x-request-id};ts:{ts};
 */
export async function verifyWebhookSignature(req: Request, dataId: string) {
  const secret = Deno.env.get("MP_WEBHOOK_SECRET");
  if (!secret) return false;
  const sig = req.headers.get("x-signature") ?? "";
  const requestId = req.headers.get("x-request-id") ?? "";
  const parts = Object.fromEntries(
    sig.split(",").map((p) => {
      const [k, ...v] = p.split("=");
      return [k.trim(), v.join("=").trim()];
    }),
  );
  if (!parts.ts || !parts.v1) return false;
  // rejeita notificações antigas (replay) — 15 min
  const tsMs = Number(parts.ts) > 1e12 ? Number(parts.ts) : Number(parts.ts) * 1000;
  if (!Number.isFinite(tsMs) || Math.abs(Date.now() - tsMs) > 15 * 60 * 1000) return false;

  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${parts.ts};`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(manifest));
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  // comparação em tempo constante
  if (hex.length !== parts.v1.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ parts.v1.charCodeAt(i);
  return diff === 0;
}
