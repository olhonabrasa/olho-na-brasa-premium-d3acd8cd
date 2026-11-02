// Cria o pedido. O preço é recalculado aqui a partir do banco: nada do
// navegador (preço, frete, desconto) é aceito como verdade.
import {
  buildQuote,
  pixCents,
  shippingFor,
  REGION_BY_UF,
  type CatalogItem,
  type PriceRow,
  type QuoteInput,
  type StoreSettings,
} from "../_shared/pricing.ts";
import {
  admin,
  clean,
  clientIpHash,
  corsHeaders,
  isAllowedOrigin,
  isValidCpf,
  isValidEmail,
  json,
  onlyDigits,
  readJson,
} from "../_shared/http.ts";

type Body = {
  quote: QuoteInput;
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
  notes?: string;
  session_id?: string;
  visitor_id?: string;
  utm?: Record<string, string>;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "Método não permitido" }, 405);
  if (!isAllowedOrigin(req)) return json(req, { error: "Origem não permitida" }, 403);

  const body = await readJson<Body>(req);
  if (!body?.quote || !body.customer || !body.address)
    return json(req, { error: "Dados incompletos" }, 400);

  const db = admin();
  const ipHash = await clientIpHash(req);
  const { data: allowed } = await db.rpc("hit_rate_limit", {
    p_bucket: "order",
    p_key: ipHash,
    p_limit: 12,
    p_window_minutes: 60,
  });
  if (allowed === false)
    return json(req, { error: "Muitas tentativas. Tente novamente em alguns minutos." }, 429);

  // ---- validação do cliente
  const customer = {
    nome: clean(body.customer.nome, 120),
    email: clean(body.customer.email, 160).toLowerCase(),
    cpf: onlyDigits(body.customer.cpf).slice(0, 11),
    whatsapp: onlyDigits(body.customer.whatsapp).slice(0, 13),
  };
  const address = {
    cep: onlyDigits(body.address.cep).slice(0, 8),
    rua: clean(body.address.rua, 160),
    numero: clean(body.address.numero, 20),
    complemento: clean(body.address.complemento, 80),
    bairro: clean(body.address.bairro, 80),
    cidade: clean(body.address.cidade, 80),
    uf: clean(body.address.uf, 2).toUpperCase(),
  };
  const errors: Record<string, string> = {};
  if (customer.nome.split(/\s+/).filter(Boolean).length < 2)
    errors.nome = "Informe nome e sobrenome.";
  if (!isValidEmail(customer.email)) errors.email = "E-mail inválido.";
  if (!isValidCpf(customer.cpf)) errors.cpf = "CPF inválido.";
  if (customer.whatsapp.length < 10) errors.whatsapp = "WhatsApp com DDD.";
  if (address.cep.length !== 8) errors.cep = "CEP com 8 dígitos.";
  if (!address.rua) errors.rua = "Informe a rua.";
  if (!address.numero) errors.numero = "Informe o número.";
  if (!address.bairro) errors.bairro = "Informe o bairro.";
  if (!address.cidade) errors.cidade = "Informe a cidade.";
  if (!REGION_BY_UF[address.uf]) errors.uf = "UF inválida.";
  if (Object.keys(errors).length)
    return json(req, { error: "Confira os dados", fields: errors }, 422);

  // ---- preço e frete a partir do banco
  const [{ data: catalog }, { data: prices }, { data: settings }] = await Promise.all([
    db.from("catalog_items").select("*"),
    db.from("price_table").select("item_id,width_cm,depth_cm,price_cents"),
    db.from("store_settings").select("*").eq("id", 1).single(),
  ]);
  if (!catalog || !prices || !settings)
    return json(req, { error: "Loja indisponível no momento" }, 503);
  const st = settings as StoreSettings;
  if (!st.checkout_enabled)
    return json(req, { error: "Pagamento online pausado. Fale com um especialista." }, 503);

  const quote = buildQuote(body.quote, catalog as CatalogItem[], prices as PriceRow[], st);
  if (!quote.ok) return json(req, { error: quote.message, reason: quote.reason }, 422);

  const shipping = shippingFor(address.uf, st);
  if (shipping == null) {
    return json(
      req,
      { error: "Frete para sua região é combinado com o especialista.", reason: "frete_whatsapp" },
      422,
    );
  }

  const total = quote.subtotal_cents + shipping;
  const pixTotal = pixCents(quote.subtotal_cents, st.pix_discount_pct) + shipping;

  const utm: Record<string, string> = {};
  for (const [k, v] of Object.entries(body.utm ?? {}).slice(0, 12))
    utm[clean(k, 30)] = clean(v, 200);

  const { data: order, error } = await db
    .from("orders")
    .insert({
      mode: quote.mode,
      width_cm: quote.width_cm,
      depth_cm: quote.depth_cm,
      tier_width_cm: quote.tier_width_cm,
      tier_depth_cm: quote.tier_depth_cm,
      items: quote.lines,
      subtotal_cents: quote.subtotal_cents,
      shipping_cents: shipping,
      total_cents: total,
      pix_total_cents: pixTotal,
      customer,
      address,
      notes: clean(body.notes, 500) || null,
      session_id: UUID.test(body.session_id ?? "") ? body.session_id : null,
      visitor_id: UUID.test(body.visitor_id ?? "") ? body.visitor_id : null,
      utm,
      ip_hash: ipHash,
    })
    .select("id, number, public_token")
    .single();
  if (error || !order) {
    console.error("order insert", error);
    return json(req, { error: "Não foi possível criar o pedido" }, 500);
  }

  await db
    .from("order_events")
    .insert({ order_id: order.id, kind: "criado", detail: { total, pixTotal } });
  if (UUID.test(body.session_id ?? "")) {
    await db
      .from("lp_sessions")
      .update({ order_id: order.id, checkout_started: true })
      .eq("id", body.session_id);
  }
  if (UUID.test(body.visitor_id ?? "")) {
    await db.from("lp_visitors").update({ order_id: order.id }).eq("id", body.visitor_id);
  }

  return json(req, {
    order_id: order.id,
    number: order.number,
    token: order.public_token,
    lines: quote.lines,
    subtotal_cents: quote.subtotal_cents,
    shipping_cents: shipping,
    total_cents: total,
    pix_total_cents: pixTotal,
    max_installments: st.max_installments,
  });
});
