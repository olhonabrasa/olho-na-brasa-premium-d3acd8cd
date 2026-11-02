import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowLeft,
  Barcode,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  Loader2,
  Lock,
  QrCode,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { brl, pixCents, shippingFor, type Quote, type QuoteInput } from "@/lib/pricing";
import {
  ApiError,
  createOrder,
  currentUtm,
  getOrderStatus,
  loadMercadoPago,
  MP_PUBLIC_KEY,
  payOrder,
  type Address,
  type CreatedOrder,
  type Customer,
  type PaymentView,
  type StoreData,
} from "@/lib/store";
import { lookupAddress } from "@/lib/cep";
import { formatCpf, formatPhone, isValidCpf, isValidEmailStrict, onlyDigits } from "@/lib/validate";
import { getTrackingIds, track } from "@/lib/tracking";

const WHATSAPP = "https://wa.me/554740420956";
const DRAFT_KEY = "onb_checkout_draft";

type Step = "dados" | "entrega" | "pagamento" | "concluido";
type Method = "pix" | "card" | "boleto";

export type CheckoutRequest = {
  input: QuoteInput;
  quote: Extract<Quote, { ok: true }>;
  store: StoreData;
};

type DL = { dataLayer?: Record<string, unknown>[]; fbq?: (...a: unknown[]) => void };
function pushDL(event: string, payload: Record<string, unknown>) {
  const w = window as unknown as DL;
  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push({ event, ...payload });
}
function fb(event: string, payload: Record<string, unknown>) {
  const w = window as unknown as DL;
  if (typeof w.fbq === "function") w.fbq("track", event, payload);
}

const REJECT_MESSAGES: Record<string, string> = {
  cc_rejected_insufficient_amount: "Saldo ou limite insuficiente. Tente outro cartão ou o Pix.",
  cc_rejected_bad_filled_security_code: "Código de segurança incorreto.",
  cc_rejected_bad_filled_date: "Data de validade incorreta.",
  cc_rejected_bad_filled_other: "Confira os dados do cartão.",
  cc_rejected_call_for_authorize:
    "O banco pediu autorização. Ligue para o seu banco e tente de novo.",
  cc_rejected_card_disabled: "Cartão bloqueado. Ative com o banco ou use outro.",
  cc_rejected_duplicated_payment: "Pagamento duplicado. Esse valor já foi cobrado.",
  cc_rejected_high_risk: "Pagamento recusado por segurança. Use o Pix ou outro cartão.",
  cc_rejected_max_attempts: "Muitas tentativas. Use outro cartão ou o Pix.",
};

export function CheckoutPanel({
  request,
  onClose,
}: {
  request: CheckoutRequest | null;
  onClose: () => void;
}) {
  const open = !!request;
  const [step, setStep] = useState<Step>("dados");
  const [customer, setCustomer] = useState<Customer>({
    nome: "",
    email: "",
    cpf: "",
    whatsapp: "",
  });
  const [address, setAddress] = useState<Address>({
    cep: "",
    rua: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    uf: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [order, setOrder] = useState<CreatedOrder | null>(null);
  const [method, setMethod] = useState<Method>("pix");
  const [payment, setPayment] = useState<PaymentView | null>(null);
  const [cepLoading, setCepLoading] = useState(false);

  // rascunho (sem CPF) para quem volta depois
  useEffect(() => {
    if (!open) return;
    try {
      const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}");
      if (d.customer) setCustomer((c) => ({ ...c, ...d.customer, cpf: c.cpf }));
      if (d.address) setAddress((a) => ({ ...a, ...d.address }));
    } catch {
      /* ignore */
    }
    setStep("dados");
    setOrder(null);
    setPayment(null);
    setFormError(null);
    setErrors({});
    track(
      "checkout_open",
      { valor: request!.quote.subtotal_cents / 100, mode: request!.input.mode },
      { section: "checkout" },
    );
    pushDL("begin_checkout", {
      ecommerce: {
        currency: "BRL",
        value: request!.quote.subtotal_cents / 100,
        items: request!.quote.lines.map((l) => ({
          item_id: l.item_id,
          item_name: l.name,
          price: l.unit_cents / 100,
          quantity: l.qty,
          item_variant: `${request!.input.width_cm}x${request!.input.depth_cm}`,
        })),
      },
    });
    fb("InitiateCheckout", { value: request!.quote.subtotal_cents / 100, currency: "BRL" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          customer: { nome: customer.nome, email: customer.email, whatsapp: customer.whatsapp },
          address,
        }),
      );
    } catch {
      /* ignore */
    }
  }, [open, customer, address]);

  const settings = request?.store.settings;
  const shipping =
    settings && address.uf.length === 2 ? shippingFor(address.uf, settings) : undefined;
  const subtotal = request?.quote.subtotal_cents ?? 0;
  const pct = settings?.pix_discount_pct ?? 5;
  const total = order?.total_cents ?? subtotal + (shipping ?? 0);
  const pixTotal = order?.pix_total_cents ?? pixCents(subtotal, pct) + (shipping ?? 0);

  const goStep = (s: Step) => {
    setStep(s);
    setFormError(null);
    track("checkout_step", { step: s }, { section: "checkout" });
  };

  const validateDados = () => {
    const e: Record<string, string> = {};
    if (customer.nome.trim().split(/\s+/).filter(Boolean).length < 2)
      e.nome = "Nome e sobrenome, como no documento.";
    if (!isValidEmailStrict(customer.email))
      e.email = "Confira o e-mail. A confirmação chega nele.";
    if (!isValidCpf(customer.cpf)) e.cpf = "CPF inválido. Confira os 11 números.";
    if (onlyDigits(customer.whatsapp).length < 10) e.whatsapp = "WhatsApp com DDD.";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const validateEntrega = () => {
    const e: Record<string, string> = {};
    if (onlyDigits(address.cep).length !== 8) e.cep = "CEP com 8 números.";
    if (!address.rua.trim()) e.rua = "Informe a rua.";
    if (!address.numero.trim()) e.numero = "Número (ou S/N).";
    if (!address.bairro.trim()) e.bairro = "Informe o bairro.";
    if (!address.cidade.trim()) e.cidade = "Informe a cidade.";
    if (address.uf.length !== 2) e.uf = "UF.";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const onCep = async (raw: string) => {
    const digits = onlyDigits(raw).slice(0, 8);
    const masked = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
    setAddress((a) => ({ ...a, cep: masked }));
    if (digits.length !== 8) return;
    setCepLoading(true);
    const found = await lookupAddress(digits);
    setCepLoading(false);
    if (found) {
      setAddress((a) => ({
        ...a,
        rua: found.rua || a.rua,
        bairro: found.bairro || a.bairro,
        cidade: found.cidade,
        uf: found.uf,
      }));
      setErrors((e) => ({ ...e, cep: "" }));
      pushDL("add_shipping_info", {
        ecommerce: { currency: "BRL", value: subtotal / 100, shipping_tier: found.uf },
      });
    } else {
      setErrors((e) => ({ ...e, cep: "Não achamos esse CEP. Preencha o endereço abaixo." }));
    }
  };

  const submitEntrega = async () => {
    if (!request || !validateEntrega()) return;
    if (shipping == null) return; // mensagem de frete já aparece na tela
    setBusy(true);
    setFormError(null);
    try {
      const ids = getTrackingIds();
      const created = await createOrder({
        quote: request.input,
        customer: {
          ...customer,
          cpf: onlyDigits(customer.cpf),
          whatsapp: onlyDigits(customer.whatsapp),
        },
        address: { ...address, cep: onlyDigits(address.cep) },
        session_id: ids.session_id,
        visitor_id: ids.visitor_id,
        utm: currentUtm(),
      });
      setOrder(created);
      track(
        "checkout_order_created",
        { pedido: created.number, total: created.total_cents / 100 },
        { section: "checkout" },
      );
      goStep("pagamento");
    } catch (err) {
      const e = err as ApiError;
      if (e.fields) setErrors(e.fields);
      setFormError(e.message);
      track("checkout_error", { step: "entrega", message: e.message }, { section: "checkout" });
    } finally {
      setBusy(false);
    }
  };

  const onPaid = (p: PaymentView) => {
    setPayment(p);
    goStep("concluido");
    const value = (p.paid_cents ?? p.total_cents) / 100;
    track(
      "purchase",
      { pedido: p.number, valor: value, metodo: p.payment_method },
      { section: "checkout" },
    );
    pushDL("purchase", {
      ecommerce: {
        transaction_id: String(p.number),
        currency: "BRL",
        value,
        items: request?.quote.lines.map((l) => ({
          item_id: l.item_id,
          item_name: l.name,
          price: l.unit_cents / 100,
          quantity: l.qty,
        })),
      },
    });
    fb("Purchase", { value, currency: "BRL", content_type: "product" });
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
  };

  const titles: Record<Step, string> = {
    dados: "Seus dados",
    entrega: "Entrega",
    pagamento: "Pagamento",
    concluido: "Pedido confirmado",
  };
  const stepIndex = ["dados", "entrega", "pagamento", "concluido"].indexOf(step);

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="checkout-overlay fixed inset-0 z-50 bg-black/70" />
        <Dialog.Content
          className="checkout-panel fixed inset-x-0 bottom-0 z-50 flex max-h-[94svh] flex-col rounded-t-[22px] border border-border-strong bg-background shadow-[0_-20px_60px_oklch(0_0_0/0.5)] md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-[480px] md:rounded-none md:border-y-0 md:border-r-0"
          data-track-section="checkout"
          aria-describedby={undefined}
          onInteractOutside={(e) => step === "pagamento" && e.preventDefault()}
        >
          <header className="flex items-center gap-2 border-b border-border px-4 py-3">
            {(step === "entrega" || (step === "pagamento" && !payment)) && (
              <button
                type="button"
                onClick={() => goStep(step === "entrega" ? "dados" : "entrega")}
                aria-label="Voltar"
                className="press grid h-11 w-11 place-items-center rounded-full text-foreground hover:bg-card"
              >
                <ArrowLeft className="h-5 w-5" aria-hidden="true" />
              </button>
            )}
            <div className="min-w-0 flex-1 px-1">
              <Dialog.Title className="text-base font-semibold text-foreground">
                {titles[step]}
              </Dialog.Title>
              <div className="mt-1.5 flex gap-1" aria-hidden="true">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-1 w-8 rounded-full transition-colors duration-300",
                      i <= stepIndex ? "bg-primary" : "bg-border",
                    )}
                  />
                ))}
              </div>
            </div>
            <Dialog.Close
              className="press grid h-11 w-11 place-items-center rounded-full text-foreground hover:bg-card"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </Dialog.Close>
          </header>

          <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-8 pt-5">
            {request && step !== "concluido" && (
              <Summary request={request} shipping={shipping} total={total} pixTotal={pixTotal} />
            )}

            {step === "dados" && (
              <form
                className="mt-6 grid gap-4"
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
                  if (validateDados()) goStep("entrega");
                }}
              >
                <Field label="Nome completo" error={errors.nome}>
                  <input
                    name="nome"
                    autoComplete="name"
                    value={customer.nome}
                    onChange={(e) => setCustomer({ ...customer, nome: e.target.value })}
                    className="field-base"
                  />
                </Field>
                <Field label="E-mail" error={errors.email}>
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    value={customer.email}
                    onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                    className="field-base"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="CPF" error={errors.cpf}>
                    <input
                      name="cpf"
                      inputMode="numeric"
                      autoComplete="off"
                      value={formatCpf(customer.cpf)}
                      onChange={(e) =>
                        setCustomer({ ...customer, cpf: onlyDigits(e.target.value) })
                      }
                      className="field-base"
                    />
                  </Field>
                  <Field label="WhatsApp" error={errors.whatsapp}>
                    <input
                      name="whatsapp"
                      type="tel"
                      autoComplete="tel-national"
                      value={formatPhone(customer.whatsapp)}
                      onChange={(e) =>
                        setCustomer({ ...customer, whatsapp: onlyDigits(e.target.value) })
                      }
                      className="field-base"
                    />
                  </Field>
                </div>
                <p className="text-xs leading-5 text-muted-foreground">
                  O CPF vai na nota fiscal e é exigido pelo Mercado Pago. Pelo WhatsApp você
                  acompanha a fabricação.
                </p>
                <PrimaryButton type="submit">Continuar para entrega</PrimaryButton>
              </form>
            )}

            {step === "entrega" && (
              <form
                className="mt-6 grid gap-4"
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
                  void submitEntrega();
                }}
              >
                <Field
                  label="CEP"
                  error={errors.cep}
                  trailing={
                    cepLoading ? (
                      <Loader2
                        className="h-4 w-4 animate-spin text-muted-foreground"
                        aria-label="Buscando CEP"
                      />
                    ) : null
                  }
                >
                  <input
                    name="cep"
                    inputMode="numeric"
                    autoComplete="postal-code"
                    value={address.cep}
                    onChange={(e) => void onCep(e.target.value)}
                    className="field-base"
                  />
                </Field>
                <Field label="Rua" error={errors.rua}>
                  <input
                    name="rua"
                    autoComplete="address-line1"
                    value={address.rua}
                    onChange={(e) => setAddress({ ...address, rua: e.target.value })}
                    className="field-base"
                  />
                </Field>
                <div className="grid grid-cols-[7rem_1fr] gap-3">
                  <Field label="Número" error={errors.numero}>
                    <input
                      name="numero"
                      value={address.numero}
                      onChange={(e) => setAddress({ ...address, numero: e.target.value })}
                      className="field-base"
                    />
                  </Field>
                  <Field label="Complemento (opcional)">
                    <input
                      name="complemento"
                      autoComplete="address-line2"
                      value={address.complemento}
                      onChange={(e) => setAddress({ ...address, complemento: e.target.value })}
                      className="field-base"
                    />
                  </Field>
                </div>
                <Field label="Bairro" error={errors.bairro}>
                  <input
                    name="bairro"
                    value={address.bairro}
                    onChange={(e) => setAddress({ ...address, bairro: e.target.value })}
                    className="field-base"
                  />
                </Field>
                <div className="grid grid-cols-[1fr_5rem] gap-3">
                  <Field label="Cidade" error={errors.cidade}>
                    <input
                      name="cidade"
                      autoComplete="address-level2"
                      value={address.cidade}
                      onChange={(e) => setAddress({ ...address, cidade: e.target.value })}
                      className="field-base"
                    />
                  </Field>
                  <Field label="UF" error={errors.uf}>
                    <input
                      name="uf"
                      autoComplete="address-level1"
                      maxLength={2}
                      value={address.uf}
                      onChange={(e) =>
                        setAddress({
                          ...address,
                          uf: e.target.value.toUpperCase().replace(/[^A-Z]/g, ""),
                        })
                      }
                      className="field-base uppercase"
                    />
                  </Field>
                </div>

                {address.uf.length === 2 && shipping === null ? (
                  <div className="rounded-xl border border-primary/40 bg-primary/10 p-4 text-sm leading-6 text-foreground">
                    Para {address.uf} o frete é combinado com o especialista, geralmente na mesma
                    hora.
                    <a
                      href={`${WHATSAPP}?text=${encodeURIComponent(`Olá! Quero fechar o kit ${request?.input.width_cm} × ${request?.input.depth_cm} cm com entrega em ${address.cidade}/${address.uf}.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 flex min-h-12 items-center justify-center rounded-xl bg-whatsapp font-semibold text-whatsapp-foreground"
                    >
                      Combinar frete no WhatsApp
                    </a>
                  </div>
                ) : (
                  <PrimaryButton type="submit" disabled={busy}>
                    {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : null}
                    {busy ? "Reservando seu pedido" : "Ir para o pagamento"}
                  </PrimaryButton>
                )}
                {formError && (
                  <p role="alert" className="text-sm text-danger">
                    {formError}
                  </p>
                )}
              </form>
            )}

            {step === "pagamento" && order && (
              <PaymentStep
                order={order}
                email={customer.email}
                method={method}
                setMethod={(m) => {
                  setMethod(m);
                  track("payment_method", { metodo: m }, { section: "checkout" });
                  pushDL("add_payment_info", {
                    ecommerce: { currency: "BRL", value: order.total_cents / 100, payment_type: m },
                  });
                }}
                pct={pct}
                onPaid={onPaid}
                onPending={(p) => setPayment(p)}
                payment={payment}
              />
            )}

            {step === "concluido" && payment && <Done payment={payment} customer={customer} />}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Summary({
  request,
  shipping,
  total,
  pixTotal,
}: {
  request: CheckoutRequest;
  shipping: number | null | undefined;
  total: number;
  pixTotal: number;
}) {
  const { quote, input } = request;
  return (
    <section className="rounded-2xl border border-border bg-card p-4" aria-label="Resumo do pedido">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {input.mode === "kit" ? "Kit Premium completo" : "Seu kit"}
          </p>
          <p className="text-xs text-muted-foreground">
            {input.mode === "kit"
              ? `Medida ${input.width_cm} × ${input.depth_cm} cm · fabricado em ${quote.tier_width_cm}${quote.tier_depth_cm ? ` × ${quote.tier_depth_cm}` : ""} cm`
              : `Churrasqueira de ${input.width_cm} × ${input.depth_cm} cm`}
          </p>
        </div>
        <p className="text-sm font-semibold text-foreground tabular-nums">
          {brl(quote.subtotal_cents)}
        </p>
      </div>
      {input.mode === "custom" && (
        <ul className="mt-3 space-y-1 text-xs text-secondary-foreground">
          {quote.lines.map((l) => (
            <li key={l.item_id} className="flex justify-between tabular-nums">
              <span>
                {l.qty}× {l.name} <span className="text-muted-foreground">· {l.size}</span>
              </span>
              <span>{brl(l.total_cents)}</span>
            </li>
          ))}
        </ul>
      )}
      <dl className="mt-3 grid gap-1 border-t border-border pt-3 text-sm tabular-nums">
        <div className="flex justify-between text-secondary-foreground">
          <dt>Frete</dt>
          <dd>
            {shipping === undefined
              ? "informe o CEP"
              : shipping === null
                ? "a combinar"
                : shipping === 0
                  ? "grátis"
                  : brl(shipping)}
          </dd>
        </div>
        <div className="flex justify-between font-semibold text-foreground">
          <dt>Total</dt>
          <dd>{brl(total)}</dd>
        </div>
        <div className="flex justify-between text-success">
          <dt>No Pix</dt>
          <dd>{brl(pixTotal)}</dd>
        </div>
      </dl>
    </section>
  );
}

function PaymentStep({
  order,
  email,
  method,
  setMethod,
  pct,
  onPaid,
  onPending,
  payment,
}: {
  order: CreatedOrder;
  email: string;
  method: Method;
  setMethod: (m: Method) => void;
  pct: number;
  onPaid: (p: PaymentView) => void;
  onPending: (p: PaymentView) => void;
  payment: PaymentView | null;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const methods: { key: Method; label: string; sub: string; Icon: typeof QrCode }[] = [
    { key: "pix", label: "Pix", sub: `${pct}% off · ${brl(order.pix_total_cents)}`, Icon: QrCode },
    {
      key: "card",
      label: "Cartão",
      sub: `até ${order.max_installments}x de ${brl(Math.round(order.total_cents / order.max_installments))}`,
      Icon: CreditCard,
    },
    { key: "boleto", label: "Boleto", sub: brl(order.total_cents), Icon: Barcode },
  ];

  const run = async (m: "pix" | "boleto") => {
    setBusy(true);
    setError(null);
    try {
      const p = await payOrder({ order_id: order.order_id, token: order.token, method: m });
      track("payment_created", { metodo: m, status: p.status }, { section: "checkout" });
      if (p.status === "pago") onPaid(p);
      else onPending(p);
    } catch (err) {
      setError((err as Error).message);
      track(
        "checkout_error",
        { step: "pagamento", metodo: m, message: (err as Error).message },
        { section: "checkout" },
      );
    } finally {
      setBusy(false);
    }
  };

  const pixPending = payment?.payment_method === "pix" && payment.pix_qr;
  const boletoPending = payment?.payment_method === "boleto" && payment.boleto_url;

  return (
    <div className="mt-6">
      <p className="text-xs text-muted-foreground">Pedido #{order.number} reservado.</p>
      <div role="radiogroup" aria-label="Forma de pagamento" className="mt-3 grid gap-2">
        {methods.map(({ key, label, sub, Icon }) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={method === key}
            onClick={() => setMethod(key)}
            className={cn(
              "press flex min-h-16 items-center gap-3 rounded-xl border px-4 text-left transition-colors duration-200",
              method === key
                ? "border-primary bg-primary/10"
                : "border-border bg-card hover:border-border-strong",
            )}
          >
            <Icon
              className={cn(
                "h-5 w-5 shrink-0",
                method === key ? "text-primary" : "text-muted-foreground",
              )}
              aria-hidden="true"
            />
            <span className="flex-1">
              <span className="block text-sm font-semibold text-foreground">{label}</span>
              <span className="block text-xs text-secondary-foreground tabular-nums">{sub}</span>
            </span>
            <span
              className={cn(
                "grid h-5 w-5 place-items-center rounded-full border",
                method === key ? "border-primary bg-primary" : "border-border-strong",
              )}
            >
              {method === key && (
                <Check className="h-3 w-3 text-primary-foreground" aria-hidden="true" />
              )}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-6">
        {method === "pix" &&
          (pixPending ? (
            <PixBox payment={payment!} order={order} onPaid={onPaid} />
          ) : (
            <PrimaryButton onClick={() => void run("pix")} disabled={busy}>
              {busy ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              ) : (
                <QrCode className="h-5 w-5" aria-hidden="true" />
              )}
              Gerar Pix de {brl(order.pix_total_cents)}
            </PrimaryButton>
          ))}

        {method === "card" && (
          <CardBrick order={order} email={email} onPaid={onPaid} onPending={onPending} />
        )}

        {method === "boleto" &&
          (boletoPending ? (
            <div className="rounded-2xl border border-border bg-card p-5 text-sm leading-6 text-secondary-foreground">
              <p className="font-semibold text-foreground">Boleto gerado.</p>
              <p className="mt-1">
                Vence em 3 dias. A fabricação começa quando o banco compensar (até 2 dias úteis).
              </p>
              <a
                href={payment!.boleto_url!}
                target="_blank"
                rel="noopener noreferrer"
                className="press mt-4 flex min-h-12 items-center justify-center rounded-xl bg-primary font-semibold text-primary-foreground"
              >
                Abrir boleto
              </a>
            </div>
          ) : (
            <PrimaryButton onClick={() => void run("boleto")} disabled={busy}>
              {busy ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              ) : (
                <Barcode className="h-5 w-5" aria-hidden="true" />
              )}
              Gerar boleto de {brl(order.total_cents)}
            </PrimaryButton>
          ))}

        {error && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {error}
          </p>
        )}
      </div>

      <p className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Lock className="h-3.5 w-3.5" aria-hidden="true" /> Pagamento processado pelo Mercado Pago
      </p>
    </div>
  );
}

function PixBox({
  payment,
  order,
  onPaid,
}: {
  payment: PaymentView;
  order: CreatedOrder;
  onPaid: (p: PaymentView) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [left, setLeft] = useState("");

  // consulta o status a cada 4s até aprovar (o webhook atualiza o pedido)
  useEffect(() => {
    let stop = false;
    const tick = async () => {
      if (stop || document.visibilityState === "hidden") return;
      const s = await getOrderStatus(order.order_id, order.token);
      if (s && s.status === "pago" && !stop) {
        stop = true;
        onPaid(s);
      }
    };
    const id = window.setInterval(() => void tick(), 4000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      stop = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [order, onPaid]);

  useEffect(() => {
    if (!payment.pix_expires_at) return;
    const end = new Date(payment.pix_expires_at).getTime();
    const upd = () => {
      const ms = Math.max(0, end - Date.now());
      setLeft(
        `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}`,
      );
    };
    upd();
    const id = window.setInterval(upd, 1000);
    return () => window.clearInterval(id);
  }, [payment.pix_expires_at]);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 text-center">
      <p className="text-sm font-semibold text-foreground">Escaneie no app do seu banco</p>
      {payment.pix_qr_base64 && (
        <img
          src={`data:image/png;base64,${payment.pix_qr_base64}`}
          alt="QR Code Pix"
          className="mx-auto mt-4 h-56 w-56 rounded-xl bg-white p-2"
        />
      )}
      <p className="mt-3 text-2xl font-bold text-foreground tabular-nums">
        {brl(payment.pix_total_cents)}
      </p>
      <button
        type="button"
        data-track="pix_copia_cola"
        onClick={() => {
          void navigator.clipboard?.writeText(payment.pix_qr ?? "");
          setCopied(true);
          track("pix_copy", {}, { section: "checkout" });
          window.setTimeout(() => setCopied(false), 2200);
        }}
        className="press mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-border-strong font-semibold text-foreground hover:border-primary/60"
      >
        {copied ? (
          <Check className="h-4 w-4 text-success" aria-hidden="true" />
        ) : (
          <Copy className="h-4 w-4" aria-hidden="true" />
        )}
        {copied ? "Código copiado" : "Copiar código Pix"}
      </button>
      <p
        className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground"
        aria-live="polite"
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> Aguardando o pagamento
        {left ? ` · expira em ${left}` : ""}
      </p>
    </div>
  );
}

type BrickController = { unmount: () => void };
type BrickForm = {
  token: string;
  issuer_id: string;
  payment_method_id: string;
  installments: number;
};

function CardBrick({
  order,
  email,
  onPaid,
  onPending,
}: {
  order: CreatedOrder;
  email: string;
  onPaid: (p: PaymentView) => void;
  onPending: (p: PaymentView) => void;
}) {
  const containerId = useMemo(() => `card-brick-${order.order_id.slice(0, 8)}`, [order.order_id]);
  const ctrl = useRef<BrickController | null>(null);
  const [ready, setReady] = useState(false);
  const [msg, setMsg] = useState<{ tone: "error" | "info"; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const MP = (await loadMercadoPago()) as new (
          k: string,
          o: object,
        ) => {
          bricks: () => { create: (t: string, id: string, s: object) => Promise<BrickController> };
        };
        if (cancelled) return;
        const mp = new MP(MP_PUBLIC_KEY, { locale: "pt-BR" });
        ctrl.current = await mp.bricks().create("cardPayment", containerId, {
          initialization: { amount: order.total_cents / 100, payer: { email } },
          customization: {
            paymentMethods: { maxInstallments: order.max_installments },
            visual: {
              hideFormTitle: true,
              style: {
                theme: "dark",
                customVariables: {
                  baseColor: "#FF6B00",
                  formBackgroundColor: "#1a1a1a",
                  inputBackgroundColor: "#121212",
                  borderRadiusMedium: "12px",
                  borderRadiusLarge: "14px",
                },
              },
            },
          },
          callbacks: {
            onReady: () => !cancelled && setReady(true),
            onError: () =>
              setMsg({
                tone: "error",
                text: "O formulário do cartão falhou. Recarregue ou use o Pix.",
              }),
            onSubmit: async (form: BrickForm) => {
              setMsg(null);
              try {
                const p = await payOrder({
                  order_id: order.order_id,
                  token: order.token,
                  method: "card",
                  card: {
                    token: form.token,
                    payment_method_id: form.payment_method_id,
                    issuer_id: form.issuer_id,
                    installments: Number(form.installments),
                  },
                });
                track(
                  "payment_created",
                  {
                    metodo: "card",
                    status: p.status,
                    detalhe: p.mp_status_detail,
                    parcelas: form.installments,
                  },
                  { section: "checkout" },
                );
                if (p.status === "pago") onPaid(p);
                else if (p.status === "em_analise") {
                  onPending(p);
                  setMsg({
                    tone: "info",
                    text: "Pagamento em análise pelo banco. Você recebe a confirmação por e-mail em até 2 dias úteis.",
                  });
                } else {
                  setMsg({
                    tone: "error",
                    text:
                      REJECT_MESSAGES[p.mp_status_detail ?? ""] ??
                      "Pagamento recusado. Tente outro cartão ou o Pix.",
                  });
                }
              } catch (err) {
                setMsg({ tone: "error", text: (err as Error).message });
              }
            },
          },
        });
      } catch {
        setMsg({
          tone: "error",
          text: "Não carregou o Mercado Pago. Confira a conexão ou use o Pix.",
        });
      }
    })();
    return () => {
      cancelled = true;
      ctrl.current?.unmount();
      ctrl.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerId]);

  return (
    <div>
      {!ready && !msg && (
        <div className="space-y-3" aria-label="Carregando formulário do cartão">
          <div className="skeleton h-12 rounded-xl" />
          <div className="grid grid-cols-2 gap-3">
            <div className="skeleton h-12 rounded-xl" />
            <div className="skeleton h-12 rounded-xl" />
          </div>
          <div className="skeleton h-12 rounded-xl" />
        </div>
      )}
      <div id={containerId} />
      {msg && (
        <p
          role="alert"
          className={cn(
            "mt-3 text-sm",
            msg.tone === "error" ? "text-danger" : "text-secondary-foreground",
          )}
        >
          {msg.text}
        </p>
      )}
    </div>
  );
}

function Done({ payment, customer }: { payment: PaymentView; customer: Customer }) {
  const first = customer.nome.trim().split(/\s+/)[0];
  return (
    <div className="pt-4 text-center">
      <CheckCircle2 className="done-check mx-auto h-16 w-16 text-success" aria-hidden="true" />
      <h3 className="mt-4 text-2xl font-bold tracking-[-0.02em] text-foreground">
        Pedido #{payment.number} pago.
      </h3>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-secondary-foreground">
        {first ? `${first}, a` : "A"} fabricação começa agora. Um especialista chama você no
        WhatsApp para confirmar as medidas antes do corte do inox.
      </p>
      <ol className="mx-auto mt-6 max-w-sm space-y-3 text-left text-sm text-secondary-foreground">
        {[
          "Conferência das medidas com o especialista",
          "Corte, solda e polimento do seu kit",
          "Envio com código de rastreio no WhatsApp",
        ].map((t, i) => (
          <li key={t} className="flex gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary">
              {i + 1}
            </span>
            {t}
          </li>
        ))}
      </ol>
      <a
        href={`${WHATSAPP}?text=${encodeURIComponent(`Olá! Acabei de pagar o pedido #${payment.number} pela página.`)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="press mt-8 flex min-h-12 items-center justify-center rounded-xl bg-whatsapp font-semibold text-whatsapp-foreground"
      >
        Falar com o especialista
      </a>
    </div>
  );
}

function Field({
  label,
  error,
  trailing,
  children,
}: {
  label: string;
  error?: string;
  trailing?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-foreground">
      <span className="flex items-center justify-between">
        {label}
        {trailing}
      </span>
      <span className={cn("field-wrap", error && "field-error")}>{children}</span>
      {error ? <span className="text-xs font-normal text-danger">{error}</span> : null}
    </label>
  );
}

function PrimaryButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className="press cta-fire flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 text-base font-bold text-primary-foreground disabled:opacity-60"
    >
      {children}
    </button>
  );
}
