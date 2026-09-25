import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Minus, Plus, ShieldCheck, Truck, Wrench } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  brl,
  buildQuote,
  KIT_ID,
  MAX_QTY,
  measureRange,
  pixCents,
  sizeLabel,
  sizesFor,
  suggestSize,
  type Piece,
  type Quote,
  type QuoteInput,
} from "@/lib/pricing";
import { loadStore, MP_PUBLIC_KEY, type StoreData } from "@/lib/store";
import { track } from "@/lib/tracking";
import guiaMedidas from "@/assets/guia-medidas.png.asset.json";
import kitCompleto from "@/assets/kit-completo.webp.asset.json";

const WHATSAPP = "https://wa.me/554740420956";

const KIT_CONTENTS = [
  { name: "Suporte Suspenso", note: "no fundo, frente livre" },
  { name: "Grelha Uruguaia Premium", note: "barras em V" },
  { name: "Grelha de Descanso", note: "mantém aquecido" },
  { name: "Espetos", note: "inox 304 maciço" },
];

type Props = {
  onCheckout: (input: QuoteInput, quote: Extract<Quote, { ok: true }>, store: StoreData) => void;
};

export function KitConfigurator({ onCheckout }: Props) {
  const [store, setStore] = useState<StoreData | null | undefined>(undefined);
  const [mode, setMode] = useState<"kit" | "custom">("kit");
  const [width, setWidth] = useState(60);
  const [depth, setDepth] = useState(50);
  // peça -> tamanho escolhido ("L|C") e quantidade
  const [pieces, setPieces] = useState<
    Record<string, { size: string; qty: number; touched?: boolean }>
  >({});
  const [guideOpen, setGuideOpen] = useState(false);
  const changeTimer = useRef<number | undefined>(undefined);
  const priceRef = useRef<HTMLDivElement>(null);
  const [priceVisible, setPriceVisible] = useState(false);

  useEffect(() => {
    const el = priceRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setPriceVisible(e.isIntersecting), {
      threshold: 0.4,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    let alive = true;
    loadStore().then((s) => alive && setStore(s));
    return () => {
      alive = false;
    };
  }, []);

  const range = useMemo(() => {
    const r = store ? measureRange(store.prices, KIT_ID) : { width: null, depth: null };
    return {
      width: r.width ?? ([50, 99] as [number, number]),
      depth: r.depth ?? ([40, 74] as [number, number]),
    };
  }, [store]);

  // o suporte acompanha a largura da boca até o cliente escolher outro tamanho
  useEffect(() => {
    if (!store) return;
    const sup = store.catalog.find((c) => c.id === "suporte_suspenso");
    if (!sup) return;
    const sug = suggestSize(store.prices, sup, width);
    setPieces((cur) => {
      const now = cur[sup.id];
      if (now?.touched) return cur;
      return {
        ...cur,
        [sup.id]: { size: sug ? `${sug.width_cm}|${sug.depth_cm}` : "", qty: now?.qty ?? 1 },
      };
    });
  }, [store, width]);

  const pieceList: Piece[] = Object.entries(pieces)
    .filter(([, p]) => p.qty > 0 && p.size)
    .map(([item_id, p]) => {
      const [w, d] = p.size.split("|").map(Number);
      return { item_id, width_cm: w, depth_cm: d, qty: p.qty };
    });
  const missingSize = Object.values(pieces).some((p) => p.qty > 0 && !p.size);
  const input: QuoteInput = {
    mode,
    width_cm: width,
    depth_cm: depth,
    pieces: mode === "custom" ? pieceList : undefined,
  };
  const quote = useMemo(
    () => (store ? buildQuote(input, store.catalog, store.prices, store.settings) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store, mode, width, depth, JSON.stringify(pieceList)],
  );

  const customItems = store?.catalog.filter((c) => c.in_kit) ?? [];

  // registra a configuração quando o cliente para de mexer (não a cada pixel do slider)
  useEffect(() => {
    if (store === undefined) return;
    window.clearTimeout(changeTimer.current);
    changeTimer.current = window.setTimeout(() => {
      track(
        "configurator_change",
        {
          mode,
          largura: width,
          comprimento: depth,
          itens:
            mode === "custom"
              ? pieceList
                  .map((p) => `${p.qty}x ${p.item_id} ${p.width_cm}x${p.depth_cm}`)
                  .join(", ")
              : undefined,
          preco: quote?.ok ? quote.subtotal_cents / 100 : null,
          status: quote?.ok ? "ok" : quote?.reason,
        },
        { section: "configurador" },
      );
    }, 900);
    return () => window.clearTimeout(changeTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, width, depth, JSON.stringify(pieceList)]);

  const pct = store?.settings.pix_discount_pct ?? 5;
  const maxInst = store?.settings.max_installments ?? 10;
  const prodDays = store?.settings.production_days ?? 10;
  const canPayOnline = !!MP_PUBLIC_KEY && !!store?.settings.checkout_enabled;

  const waText = encodeURIComponent(
    `Olá! Montei meu kit na página: ${mode === "kit" ? "Kit Premium completo" : "peças avulsas"}, medida ${width} × ${depth} cm. Pode me ajudar?`,
  );

  return (
    <div className="configurator mx-auto grid max-w-(--container-max) gap-8 px-4 md:px-5 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
      {/* ------- PLANTA ------- */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <Blueprint
          width={width}
          depth={depth}
          tierW={quote?.ok && mode === "kit" ? quote.tier_width_cm : null}
          tierD={quote?.ok && mode === "kit" ? quote.tier_depth_cm : null}
        />
        <button
          type="button"
          onClick={() => {
            setGuideOpen((v) => !v);
            track("measure_guide", { open: !guideOpen }, { section: "configurador" });
          }}
          aria-expanded={guideOpen}
          className="press mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg px-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Como medir a sua churrasqueira
          <ChevronDown
            className={cn("h-4 w-4 transition-transform duration-200", guideOpen && "rotate-180")}
            aria-hidden="true"
          />
        </button>
        <div className={cn("guide-reveal grid", guideOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
          <div className="overflow-hidden">
            <div className="mt-2 rounded-2xl border border-border bg-card p-4">
              <p className="text-sm leading-6 text-secondary-foreground">
                <strong className="text-foreground">A</strong> é a largura interna da boca,{" "}
                <strong className="text-foreground">sem contar a pedra</strong>.{" "}
                <strong className="text-foreground">B</strong> é o comprimento interno, da frente
                até a parede do fundo. Uma trena resolve em um minuto.
              </p>
              <img
                src={guiaMedidas.url}
                alt="Guia mostrando onde medir a largura A e o comprimento B da churrasqueira"
                className="mt-3 w-full rounded-xl bg-white"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ------- CONTROLES ------- */}
      <div>
        <div
          role="tablist"
          aria-label="Tipo de compra"
          className="segmented grid grid-cols-2 rounded-xl border border-border bg-card p-1"
        >
          {(
            [
              ["kit", "Kit completo"],
              ["custom", "Monte o seu"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              role="tab"
              type="button"
              aria-selected={mode === key}
              onClick={() => {
                setMode(key);
                track("configurator_mode", { mode: key }, { section: "configurador" });
              }}
              className={cn(
                "press min-h-11 rounded-lg text-sm font-semibold transition-colors duration-200",
                mode === key
                  ? "bg-primary text-primary-foreground"
                  : "text-secondary-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-6">
          <MeasureField
            letter="A"
            label="Largura da boca"
            hint="por dentro, sem a pedra"
            value={width}
            min={range.width[0]}
            max={range.width[1]}
            onChange={setWidth}
          />
          <MeasureField
            letter="B"
            label="Comprimento interno"
            hint="da frente até o fundo"
            value={depth}
            min={range.depth[0]}
            max={range.depth[1]}
            onChange={setDepth}
          />
        </div>

        {mode === "kit" ? (
          <div className="mt-7 flex gap-4 rounded-2xl border border-border bg-card p-4">
            <img
              src={kitCompleto.url}
              alt="Kit Premium Olho na Brasa com suporte suspenso, grelhas e espetos"
              className="h-24 w-24 shrink-0 rounded-xl bg-white object-cover"
              loading="lazy"
            />
            <ul className="grid content-center gap-1.5 text-sm">
              {KIT_CONTENTS.map((i) => (
                <li key={i.name} className="flex items-baseline gap-2 text-foreground">
                  <Check
                    className="h-3.5 w-3.5 shrink-0 translate-y-0.5 text-primary"
                    aria-hidden="true"
                  />
                  <span>
                    {i.name} <span className="text-muted-foreground">· {i.note}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <ul className="mt-7 grid gap-2">
            {customItems.map((item) => {
              const cur = pieces[item.id] ?? { size: "", qty: 0 };
              const sizes = store ? sizesFor(store.prices, item.id) : [];
              const needsSize = cur.qty > 0 && !cur.size;
              return (
                <li
                  key={item.id}
                  className={cn(
                    "rounded-xl border px-4 py-3 transition-colors",
                    cur.qty ? "border-primary/50 bg-primary/5" : "border-border bg-card",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.summary}</p>
                    </div>
                    <Stepper
                      label={item.name}
                      value={cur.qty}
                      onChange={(v) =>
                        setPieces((all) => ({ ...all, [item.id]: { ...cur, qty: v } }))
                      }
                    />
                  </div>
                  {sizes.length ? (
                    <label className="mt-2.5 block">
                      <span className="sr-only">Tamanho de {item.name}</span>
                      <select
                        name={`tamanho_${item.id}`}
                        value={cur.size}
                        onChange={(e) =>
                          setPieces((all) => ({
                            ...all,
                            [item.id]: { size: e.target.value, qty: cur.qty || 1, touched: true },
                          }))
                        }
                        className={cn(
                          "h-11 w-full rounded-lg border bg-background px-3 text-sm text-foreground tabular-nums focus:border-primary focus:outline-none",
                          needsSize ? "border-primary" : "border-border",
                        )}
                      >
                        <option value="">Escolha o tamanho</option>
                        {sizes.map((z) => (
                          <option
                            key={`${z.width_cm}|${z.depth_cm}`}
                            value={`${z.width_cm}|${z.depth_cm}`}
                          >
                            {sizeLabel(item.size_kind, z.width_cm, z.depth_cm)} ·{" "}
                            {brl(z.price_cents)}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Tamanho sob consulta com o especialista.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {/* ------- PREÇO ------- */}
        <div
          ref={priceRef}
          className="price-card mt-6 rounded-2xl border border-border-strong bg-card p-5 md:p-6"
          aria-live="polite"
        >
          {store === undefined ? (
            <div className="space-y-3" aria-label="Carregando preços">
              <div className="skeleton h-4 w-32 rounded" />
              <div className="skeleton h-10 w-48 rounded" />
              <div className="skeleton h-4 w-56 rounded" />
            </div>
          ) : quote?.ok ? (
            <>
              <p className="text-sm text-secondary-foreground">
                {mode === "kit"
                  ? "Kit Premium"
                  : `${quote.lines.reduce((s, l) => s + l.qty, 0)} peças`}{" "}
                para {width} × {depth} cm
              </p>
              <p
                key={quote.subtotal_cents}
                className="price-tick mt-1 font-display text-[2.4rem] font-bold leading-none tracking-[-0.02em] text-foreground tabular-nums"
              >
                {brl(quote.subtotal_cents)}
              </p>
              <p className="mt-2 text-sm text-secondary-foreground tabular-nums">
                <span className="font-semibold text-success">
                  {brl(pixCents(quote.subtotal_cents, pct))} no Pix
                </span>{" "}
                ({pct}% off) ou {maxInst}x de {brl(Math.round(quote.subtotal_cents / maxInst))} sem
                juros
              </p>
              {mode === "custom" && missingSize && (
                <p className="mt-3 text-xs leading-5 text-primary">
                  Tem peça sem tamanho escolhido; ela não entrou no valor.
                </p>
              )}
              {mode === "kit" &&
                (quote.tier_width_cm !== width ||
                  (quote.tier_depth_cm > 0 && quote.tier_depth_cm !== depth)) && (
                  <p className="mt-3 text-xs leading-5 text-muted-foreground">
                    Fabricado em {quote.tier_width_cm}
                    {quote.tier_depth_cm ? ` × ${quote.tier_depth_cm}` : ""} cm, a faixa que entra
                    na sua medida com folga.
                  </p>
                )}
              <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto]">
                {canPayOnline ? (
                  <button
                    type="button"
                    data-track="comprar_configurador"
                    onClick={() => store && onCheckout(input, quote, store)}
                    className="press cta-fire min-h-14 rounded-xl bg-primary px-6 text-base font-bold text-primary-foreground"
                  >
                    Comprar agora
                  </button>
                ) : (
                  <a
                    href={`${WHATSAPP}?text=${waText}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="press cta-fire flex min-h-14 items-center justify-center rounded-xl bg-primary px-6 text-base font-bold text-primary-foreground"
                  >
                    Fechar pelo WhatsApp
                  </a>
                )}
                <a
                  href={`${WHATSAPP}?text=${waText}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-track="duvida_configurador"
                  className="press flex min-h-14 items-center justify-center rounded-xl border border-border-strong px-5 text-sm font-semibold text-foreground hover:border-primary/60"
                >
                  Tirar dúvida
                </a>
              </div>
            </>
          ) : (
            <>
              <p className="text-lg font-semibold text-foreground">Essa a gente faz sob medida.</p>
              <p className="mt-2 text-sm leading-6 text-secondary-foreground">
                {quote?.message ??
                  "Os preços não carregaram agora. Um especialista passa o valor em minutos pelo WhatsApp."}
              </p>
              <a
                href={`${WHATSAPP}?text=${waText}`}
                target="_blank"
                rel="noopener noreferrer"
                data-track="orcamento_sob_medida"
                className="press cta-fire mt-5 flex min-h-14 items-center justify-center rounded-xl bg-primary px-6 text-base font-bold text-primary-foreground"
              >
                Pedir orçamento sob medida
              </a>
            </>
          )}
        </div>

        {/* celular: preço ao vivo enquanto mexe na medida */}
        {quote?.ok && (
          <div
            className="price-dock sticky bottom-3 z-20 mt-4 lg:hidden"
            data-hidden={priceVisible}
            aria-hidden={priceVisible}
          >
            <button
              type="button"
              tabIndex={priceVisible ? -1 : 0}
              onClick={() =>
                priceRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
              }
              className="press flex w-full items-center justify-between gap-3 rounded-2xl border border-border-strong bg-card/95 px-4 py-3 text-left shadow-[0_12px_32px_oklch(0_0_0/0.55)] backdrop-blur"
            >
              <span>
                <span className="block text-xs text-secondary-foreground">
                  {width} × {depth} cm
                </span>
                <span
                  key={quote.subtotal_cents}
                  className="price-tick block text-lg font-bold text-foreground tabular-nums"
                >
                  {brl(quote.subtotal_cents)}
                </span>
              </span>
              <span className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">
                Ver e comprar
              </span>
            </button>
          </div>
        )}

        <ul className="mt-5 grid grid-cols-1 gap-2 text-sm text-secondary-foreground sm:grid-cols-3">
          <li className="flex items-center gap-2">
            <Wrench className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" /> Pronto em até{" "}
            {prodDays} dias úteis
          </li>
          <li className="flex items-center gap-2">
            <Truck className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" /> Frete grátis Sul
            e Sudeste
          </li>
          <li className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" /> 15 anos de
            garantia
          </li>
        </ul>
      </div>
    </div>
  );
}

function MeasureField({
  letter,
  label,
  hint,
  value,
  min,
  max,
  onChange,
}: {
  letter: string;
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const pos = Math.min(100, Math.max(0, ((value - min) / Math.max(1, max - min)) * 100));

  const commit = (raw: string) => {
    const n = parseInt(raw.replace(/\D/g, ""), 10);
    if (Number.isFinite(n) && n >= 20 && n <= 300) onChange(n);
    else setDraft(String(value));
  };

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold text-foreground">
          <span className="mr-2 inline-grid h-6 w-6 place-items-center rounded-md bg-primary/15 text-xs font-bold text-primary">
            {letter}
          </span>
          {label}
        </label>
        <span className="text-xs text-muted-foreground">{hint}</span>
      </div>
      <div className="mt-3 flex items-center gap-4">
        <div className="relative w-[7.5rem] shrink-0">
          <input
            id={id}
            name={`medida_${letter.toLowerCase()}`}
            inputMode="numeric"
            autoComplete="off"
            value={draft}
            onChange={(e) => setDraft(e.target.value.replace(/\D/g, "").slice(0, 3))}
            onBlur={(e) => commit(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && commit((e.target as HTMLInputElement).value)}
            className="measure-input h-14 w-full rounded-xl border border-border-strong bg-background pl-4 pr-11 text-center text-2xl font-bold text-foreground tabular-nums"
          />
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            cm
          </span>
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={Math.min(max, Math.max(min, value))}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={`${label} em centímetros`}
          className="measure-range flex-1"
          style={{ ["--pos" as string]: `${pos}%` }}
        />
      </div>
    </div>
  );
}

function Stepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label={`Quantidade de ${label}`}>
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        disabled={value === 0}
        aria-label={`Remover ${label}`}
        className="press grid h-10 w-10 place-items-center rounded-lg border border-border text-foreground disabled:opacity-35"
      >
        <Minus className="h-4 w-4" aria-hidden="true" />
      </button>
      <span className="w-7 text-center text-base font-semibold tabular-nums text-foreground">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(MAX_QTY, value + 1))}
        disabled={value === MAX_QTY}
        aria-label={`Adicionar ${label}`}
        className="press grid h-10 w-10 place-items-center rounded-lg border border-border text-foreground disabled:opacity-35"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

/**
 * Planta vista de cima: a boca da churrasqueira (A × B) se redesenha a cada
 * medida; o tracejado laranja é a peça fabricada na faixa que cabe.
 * Tudo por transform, então as transições ficam na GPU.
 */
function Blueprint({
  width,
  depth,
  tierW,
  tierD,
}: {
  width: number;
  depth: number;
  tierW: number | null;
  tierD: number | null;
}) {
  const VW = 360;
  const VH = 300;
  const k = 2.35; // px por cm
  const w = Math.min(110, Math.max(30, width)) * k;
  const d = Math.min(80, Math.max(30, depth)) * k;
  const cx = VW / 2;
  const cy = 136;
  const top = cy - d / 2;
  const bottom = cy + d / 2;
  const left = cx - w / 2;
  const right = cx + w / 2;
  const tw = tierW ? Math.min(110, width, tierW) * k : 0;
  const td = tierD ? Math.min(80, depth, tierD) * k : d * 0.92;

  const ease = { transition: "transform 460ms cubic-bezier(0.23, 1, 0.32, 1)" };

  return (
    <figure className="blueprint relative overflow-hidden rounded-2xl border border-border bg-card">
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        className="block h-auto w-full"
        role="img"
        aria-label={`Planta da churrasqueira com ${width} centímetros de largura e ${depth} de comprimento`}
      >
        <defs>
          <pattern id="bp-grid" width="12" height="12" patternUnits="userSpaceOnUse">
            <path
              d="M12 0H0V12"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-white/[0.06]"
            />
          </pattern>
        </defs>
        <rect width={VW} height={VH} fill="url(#bp-grid)" />

        {/* parede do fundo */}
        <g
          style={{ ...ease, transform: `translate(${cx}px, ${top}px) scale(${(w + 28) / 100}, 1)` }}
        >
          <rect
            x={-50}
            y={-14}
            width={100}
            height={10}
            fill="currentColor"
            className="text-white/10"
          />
        </g>

        {/* boca da churrasqueira */}
        <g
          style={{
            ...ease,
            transform: `translate(${cx}px, ${cy}px) scale(${w / 100}, ${d / 100})`,
          }}
        >
          <rect
            x={-50}
            y={-50}
            width={100}
            height={100}
            rx={1.2}
            fill="oklch(0.2 0.02 50 / 0.55)"
            stroke="oklch(0.985 0 0 / 0.55)"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
          {/* suporte suspenso no fundo */}
          <rect x={-46} y={-47} width={92} height={4} fill="oklch(0.84 0.01 250 / 0.75)" />
        </g>

        {/* peça fabricada (faixa) */}
        {tierW ? (
          <g
            style={{
              ...ease,
              transform: `translate(${cx}px, ${cy - (d - td) / 2 + 2}px) scale(${tw / 100}, ${td / 100})`,
            }}
          >
            <rect
              x={-50}
              y={-50}
              width={100}
              height={100}
              fill="oklch(0.69 0.205 48.5 / 0.1)"
              stroke="oklch(0.69 0.205 48.5)"
              strokeWidth={1.5}
              strokeDasharray="5 4"
              vectorEffect="non-scaling-stroke"
            />
            {Array.from({ length: 11 }, (_, i) => -40 + i * 8).map((x) => (
              <line
                key={x}
                x1={x}
                x2={x}
                y1={-38}
                y2={44}
                stroke="oklch(0.84 0.01 250 / 0.55)"
                strokeWidth={1.25}
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </g>
        ) : null}

        {/* cota A (embaixo) */}
        <g
          style={{
            ...ease,
            transform: `translate(${cx}px, ${bottom + 22}px) scale(${w / 100}, 1)`,
          }}
        >
          <line
            x1={-50}
            x2={50}
            y1={0}
            y2={0}
            stroke="oklch(0.69 0.205 48.5)"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
        </g>
        <g style={{ ...ease, transform: `translate(${left}px, ${bottom + 22}px)` }}>
          <line y1={-7} y2={7} stroke="oklch(0.69 0.205 48.5)" strokeWidth={1.5} />
        </g>
        <g style={{ ...ease, transform: `translate(${right}px, ${bottom + 22}px)` }}>
          <line y1={-7} y2={7} stroke="oklch(0.69 0.205 48.5)" strokeWidth={1.5} />
        </g>
        <g style={{ ...ease, transform: `translate(${cx}px, ${bottom + 44}px)` }}>
          <text textAnchor="middle" className="fill-foreground text-[15px] font-bold tabular-nums">
            A {width} cm
          </text>
        </g>

        {/* cota B (direita) */}
        <g
          style={{ ...ease, transform: `translate(${right + 22}px, ${cy}px) scale(1, ${d / 100})` }}
        >
          <line
            y1={-50}
            y2={50}
            x1={0}
            x2={0}
            stroke="oklch(0.69 0.205 48.5)"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
        </g>
        <g style={{ ...ease, transform: `translate(${right + 22}px, ${top}px)` }}>
          <line x1={-7} x2={7} stroke="oklch(0.69 0.205 48.5)" strokeWidth={1.5} />
        </g>
        <g style={{ ...ease, transform: `translate(${right + 22}px, ${bottom}px)` }}>
          <line x1={-7} x2={7} stroke="oklch(0.69 0.205 48.5)" strokeWidth={1.5} />
        </g>
        <g style={{ ...ease, transform: `translate(${Math.min(VW - 18, right + 36)}px, ${cy}px)` }}>
          <text
            textAnchor="middle"
            transform="rotate(-90)"
            className="fill-foreground text-[15px] font-bold tabular-nums"
          >
            B {depth} cm
          </text>
        </g>

        <text x={cx} y={VH - 12} textAnchor="middle" className="fill-muted-foreground text-[11px]">
          frente da churrasqueira
        </text>
      </svg>
    </figure>
  );
}
