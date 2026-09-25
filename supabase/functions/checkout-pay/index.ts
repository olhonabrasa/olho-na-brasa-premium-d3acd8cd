// Cria o pagamento no Mercado Pago para um pedido existente.
// Pix e boleto: criados aqui. Cartão: recebe o TOKEN gerado pelo Card Payment
// Brick (o número do cartão nunca passa pelo nosso servidor).
// O valor cobrado vem SEMPRE do pedido salvo no banco.
import {
  admin,
  clean,
  clientIpHash,
  corsHeaders,
  isAllowedOrigin,
  json,
  readJson,
} from "../_shared/http.ts";
import { createPayment, orderStatusFrom, type MpPayment } from "../_shared/mercadopago.ts";

type Body = {
  order_id: string;
  token: string;
  method: "pix" | "card" | "boleto";
  card?: {
    token: string;
    payment_method_id: string;
    issuer_id?: string | number;
    installments: number;
  };
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "Método não permitido" }, 405);
  if (!isAllowedOrigin(req)) return json(req, { error: "Origem não permitida" }, 403);

  const body = await readJson<Body>(req);
  if (!body || !UUID.test(body.order_id ?? "") || typeof body.token !== "string") {
    return json(req, { error: "Pedido inválido" }, 400);
  }
  if (!["pix", "card", "boleto"].includes(body.method))
    return json(req, { error: "Forma de pagamento inválida" }, 400);

  const db = admin();
  const ipHash = await clientIpHash(req);
  const { data: allowed } = await db.rpc("hit_rate_limit", {
    p_bucket: "pay",
    p_key: ipHash,
    p_limit: 20,
    p_window_minutes: 60,
  });
  if (allowed === false)
    return json(req, { error: "Muitas tentativas. Aguarde alguns minutos." }, 429);

  const { data: order } = await db.from("orders").select("*").eq("id", body.order_id).single();
  if (!order || order.public_token !== body.token)
    return json(req, { error: "Pedido não encontrado" }, 404);
  if (["pago", "em_producao", "enviado", "entregue", "em_analise"].includes(order.status)) {
    return json(
      req,
      { error: "Este pedido já tem pagamento em andamento.", status: order.status },
      409,
    );
  }
  if (Date.now() - new Date(order.created_at).getTime() > 7 * 24 * 3600 * 1000) {
    return json(req, { error: "Pedido expirado. Monte o kit novamente." }, 410);
  }

  // Pix ainda válido: devolve o mesmo QR em vez de criar outro
  if (
    body.method === "pix" &&
    order.payment_method === "pix" &&
    order.pix_qr &&
    order.pix_expires_at &&
    new Date(order.pix_expires_at) > new Date()
  ) {
    return json(req, publicView(order));
  }

  const [first, ...rest] = String(order.customer.nome).trim().split(/\s+/);
  const payer = {
    email: order.customer.email,
    first_name: first,
    last_name: rest.join(" ") || first,
    identification: { type: "CPF", number: order.customer.cpf },
  };
  const siteUrl = Deno.env.get("PUBLIC_SITE_URL") ?? "https://premium.olhonabrasa.com.br";
  const common = {
    description: `Olho na Brasa · Pedido #${order.number}`,
    external_reference: order.id,
    notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/mp-webhook`,
    statement_descriptor: "OLHONABRASA",
    metadata: { order_id: order.id, order_number: order.number },
    additional_info: {
      items: (
        order.items as {
          item_id: string;
          name: string;
          size?: string;
          qty: number;
          unit_cents: number;
        }[]
      ).map((l) => ({
        id: l.item_id,
        title: l.name,
        description: l.size ?? `${order.width_cm} x ${order.depth_cm} cm`,
        category_id: "home",
        quantity: l.qty,
        unit_price: l.unit_cents / 100,
      })),
      payer: {
        first_name: payer.first_name,
        last_name: payer.last_name,
        phone: {
          area_code: order.customer.whatsapp.slice(-11, -9),
          number: order.customer.whatsapp.slice(-9),
        },
        address: {
          zip_code: order.address.cep,
          street_name: order.address.rua,
          street_number: order.address.numero,
        },
      },
      shipments: {
        receiver_address: {
          zip_code: order.address.cep,
          state_name: order.address.uf,
          city_name: order.address.cidade,
          street_name: order.address.rua,
          street_number: order.address.numero,
        },
      },
    },
  };

  let payment: MpPayment;
  let amountCents: number;
  try {
    if (body.method === "pix") {
      amountCents = order.pix_total_cents;
      payment = await createPayment(
        {
          ...common,
          transaction_amount: amountCents / 100,
          payment_method_id: "pix",
          date_of_expiration: new Date(Date.now() + 60 * 60 * 1000)
            .toISOString()
            .replace("Z", "-00:00"),
          payer,
        },
        crypto.randomUUID(),
      );
    } else if (body.method === "boleto") {
      amountCents = order.total_cents;
      payment = await createPayment(
        {
          ...common,
          transaction_amount: amountCents / 100,
          payment_method_id: "bolbradesco",
          date_of_expiration: new Date(Date.now() + 3 * 24 * 3600 * 1000)
            .toISOString()
            .replace("Z", "-00:00"),
          payer: {
            ...payer,
            address: {
              zip_code: order.address.cep,
              street_name: order.address.rua,
              street_number: order.address.numero,
              neighborhood: order.address.bairro,
              city: order.address.cidade,
              federal_unit: order.address.uf,
            },
          },
        },
        crypto.randomUUID(),
      );
    } else {
      const c = body.card;
      const { data: st } = await db
        .from("store_settings")
        .select("max_installments")
        .eq("id", 1)
        .single();
      const maxInst = st?.max_installments ?? 10;
      if (!c?.token || !c.payment_method_id)
        return json(req, { error: "Dados do cartão incompletos" }, 400);
      const installments = Math.floor(Number(c.installments));
      if (!Number.isFinite(installments) || installments < 1 || installments > maxInst) {
        return json(req, { error: `Parcelamento em até ${maxInst}x` }, 400);
      }
      amountCents = order.total_cents;
      payment = await createPayment(
        {
          ...common,
          transaction_amount: amountCents / 100,
          token: clean(c.token, 100),
          installments,
          payment_method_id: clean(c.payment_method_id, 30),
          issuer_id: c.issuer_id ? Number(c.issuer_id) : undefined,
          payer: { email: payer.email, identification: payer.identification },
        },
        crypto.randomUUID(),
      );
    }
  } catch (err) {
    console.error("mp create", err);
    await db
      .from("order_events")
      .insert({
        order_id: order.id,
        kind: "erro_pagamento",
        detail: { method: body.method, message: String(err) },
      });
    return json(
      req,
      { error: "O Mercado Pago não aceitou o pagamento. Confira os dados ou tente outra forma." },
      502,
    );
  }

  const tx = payment.point_of_interaction?.transaction_data;
  const patch = {
    status: orderStatusFrom(payment.status),
    payment_method: body.method,
    installments: payment.installments ?? (body.method === "card" ? body.card?.installments : 1),
    mp_payment_id: String(payment.id),
    mp_status: payment.status,
    mp_status_detail: payment.status_detail,
    paid_cents: payment.status === "approved" ? Math.round(payment.transaction_amount * 100) : null,
    pix_qr: tx?.qr_code ?? null,
    pix_qr_base64: tx?.qr_code_base64 ?? null,
    pix_expires_at: body.method === "pix" ? (payment.date_of_expiration ?? null) : null,
    boleto_url: payment.transaction_details?.external_resource_url ?? null,
  };
  const { data: updated } = await db
    .from("orders")
    .update(patch)
    .eq("id", order.id)
    .select("*")
    .single();
  await db.from("order_events").insert({
    order_id: order.id,
    kind: "pagamento_criado",
    detail: {
      method: body.method,
      mp_id: payment.id,
      status: payment.status,
      detail: payment.status_detail,
      amount_cents: amountCents,
      ip: ipHash,
    },
  });

  return json(req, publicView(updated ?? { ...order, ...patch }));
});

function publicView(o: Record<string, unknown>) {
  return {
    order_id: o.id,
    number: o.number,
    status: o.status,
    payment_method: o.payment_method,
    mp_status: o.mp_status,
    mp_status_detail: o.mp_status_detail,
    total_cents: o.total_cents,
    pix_total_cents: o.pix_total_cents,
    paid_cents: o.paid_cents,
    pix_qr: o.pix_qr,
    pix_qr_base64: o.pix_qr_base64,
    pix_expires_at: o.pix_expires_at,
    boleto_url: o.boleto_url,
  };
}
