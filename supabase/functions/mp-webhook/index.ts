// Webhook do Mercado Pago. Nunca confia no corpo: valida a assinatura
// (x-signature) e busca o pagamento na API antes de mudar o pedido.
import { admin } from "../_shared/http.ts";
import { getPayment, orderStatusFrom, verifyWebhookSignature } from "../_shared/mercadopago.ts";

const FINAL = new Set(["em_producao", "enviado", "entregue"]);

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ok", { status: 200 });

  const url = new URL(req.url);
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    /* corpo vazio em alguns testes do painel do MP */
  }
  const type =
    url.searchParams.get("type") ?? url.searchParams.get("topic") ?? (body.type as string) ?? "";
  const dataId =
    url.searchParams.get("data.id") ?? String((body.data as { id?: unknown })?.id ?? "");
  if (type !== "payment" || !/^\d{1,20}$/.test(dataId))
    return new Response("ignored", { status: 200 });

  if (!(await verifyWebhookSignature(req, dataId))) {
    console.warn("webhook: assinatura inválida", dataId);
    return new Response("invalid signature", { status: 401 });
  }

  const db = admin();
  let payment;
  try {
    payment = await getPayment(dataId);
  } catch (err) {
    console.error(err);
    return new Response("retry", { status: 500 }); // MP reenvia
  }

  const orderId = payment.external_reference;
  if (!orderId) return new Response("no reference", { status: 200 });
  const { data: order } = await db
    .from("orders")
    .select(
      "id, status, number, total_cents, customer, address, items, session_id, width_cm, depth_cm, mp_payment_id",
    )
    .eq("id", orderId)
    .single();
  if (!order) return new Response("unknown order", { status: 200 });

  const next = orderStatusFrom(payment.status);
  // Um pagamento antigo recusado não sobrescreve um pedido que já foi pago por outro pagamento.
  const isCurrent =
    !order.mp_payment_id ||
    order.mp_payment_id === String(payment.id) ||
    payment.status === "approved";
  const keep = FINAL.has(order.status) && next === "pago";
  if (isCurrent && !keep) {
    await db
      .from("orders")
      .update({
        status: next,
        mp_payment_id: String(payment.id),
        mp_status: payment.status,
        mp_status_detail: payment.status_detail,
        paid_cents:
          payment.status === "approved" ? Math.round(payment.transaction_amount * 100) : null,
      })
      .eq("id", order.id);
  }
  await db.from("order_events").insert({
    order_id: order.id,
    kind: "webhook",
    detail: {
      mp_id: payment.id,
      status: payment.status,
      detail: payment.status_detail,
      applied: isCurrent && !keep,
    },
  });

  const becamePaid =
    next === "pago" && order.status !== "pago" && !FINAL.has(order.status) && isCurrent;
  if (becamePaid) {
    if (order.session_id)
      await db.from("lp_sessions").update({ purchased: true }).eq("id", order.session_id);
    const crm = Deno.env.get("CRM_WEBHOOK_URL");
    if (crm) {
      try {
        await fetch(crm, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            evento: "pedido_pago",
            pedido: order.number,
            valor: payment.transaction_amount,
            nome: order.customer?.nome,
            whatsapp: order.customer?.whatsapp,
            email: order.customer?.email,
            cep: order.address?.cep,
            estado: order.address?.uf,
            medidas: `${order.width_cm} x ${order.depth_cm} cm`,
            itens: (order.items as { name: string; qty: number; size?: string }[])
              .map((i) => `${i.qty}x ${i.name}${i.size ? ` (${i.size})` : ""}`)
              .join(", "),
            origem_captura: "checkout_lp",
          }),
        });
      } catch (err) {
        console.error("crm", err);
      }
    }
  }

  return new Response("ok", { status: 200 });
});
