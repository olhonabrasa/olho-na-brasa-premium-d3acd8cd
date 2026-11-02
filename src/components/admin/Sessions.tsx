import { useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ExternalLink, Search, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { brl } from "@/lib/pricing";
import { ClickMap } from "./ClickMap";
import {
  downloadCsv,
  EVENT_LABELS,
  fetchEvents,
  fmtDate,
  fmtDuration,
  ORDER_STATUS,
  SECTION_LABELS,
  SECTION_ORDER,
  sourceOf,
  waLink,
  type Lead,
  type Order,
  type Session,
  type TrackEvent,
} from "./data";
import { Empty, HBar, Panel, Pill, Segmented } from "./ui";

type Filter = "todas" | "leads" | "configuraram" | "checkout" | "compraram" | "engajadas";

export function Sessions({
  sessions,
  leads,
  orders,
  openSessionId,
  onOpen,
}: {
  sessions: Session[];
  leads: Lead[];
  orders: Order[];
  openSessionId: string | null;
  onOpen: (id: string | null) => void;
}) {
  const [filter, setFilter] = useState<Filter>("todas");
  const [device, setDevice] = useState<"todos" | "mobile" | "desktop">("todos");
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(100);

  const leadById = useMemo(() => new Map(leads.map((l) => [l.id, l])), [leads]);
  const leadByVisitor = useMemo(() => {
    const m = new Map<string, Lead>();
    leads.forEach((l) => l.visitor_id && !m.has(l.visitor_id) && m.set(l.visitor_id, l));
    return m;
  }, [leads]);
  const orderById = useMemo(() => new Map(orders.map((o) => [o.id, o])), [orders]);

  const leadFor = (s: Session) =>
    (s.lead_id ? leadById.get(s.lead_id) : undefined) ?? leadByVisitor.get(s.visitor_id);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return sessions.filter((s) => {
      if (filter === "leads" && !leadFor(s)) return false;
      if (filter === "configuraram" && !s.configured) return false;
      if (filter === "checkout" && !s.checkout_started) return false;
      if (filter === "compraram" && !s.purchased) return false;
      if (filter === "engajadas" && s.active_ms < 60_000) return false;
      if (
        device !== "todos" &&
        (device === "mobile" ? s.device !== "mobile" : s.device === "mobile")
      )
        return false;
      if (term) {
        const l = leadFor(s);
        const hay = [
          l?.nome,
          l?.whatsapp,
          l?.email,
          l?.cidade,
          s.utm_campaign,
          s.utm_source,
          sourceOf(s),
          s.id,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions, filter, device, q, leadById, leadByVisitor]);

  const open = openSessionId ? (sessions.find((s) => s.id === openSessionId) ?? null) : null;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            ["todas", "Todas"],
            ["engajadas", "+1 min ativo"],
            ["configuraram", "Configuraram"],
            ["checkout", "Checkout"],
            ["leads", "Com lead"],
            ["compraram", "Compraram"],
          ]}
        />
        <Segmented
          value={device}
          onChange={setDevice}
          options={[
            ["todos", "Todos"],
            ["mobile", "Celular"],
            ["desktop", "Computador"],
          ]}
        />
        <label className="relative ml-auto w-full max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nome, WhatsApp, campanha…"
            aria-label="Buscar sessões"
            className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </label>
        <button
          type="button"
          onClick={() =>
            downloadCsv(
              `sessoes-${new Date().toISOString().slice(0, 10)}.csv`,
              list.map((s) => {
                const l = leadFor(s);
                return {
                  inicio: s.started_at,
                  lead: l?.nome ?? "",
                  whatsapp: l?.whatsapp ?? "",
                  fonte: sourceOf(s),
                  campanha: s.utm_campaign ?? "",
                  dispositivo: s.device,
                  tempo_ativo_s: Math.round(s.active_ms / 1000),
                  rolagem_max: s.max_scroll_pct,
                  cliques: s.clicks,
                  configurou: s.configured,
                  checkout: s.checkout_started,
                  whatsapp_click: s.whatsapp_clicked,
                  comprou: s.purchased,
                  ultima_secao: s.furthest_section ?? "",
                };
              }),
            )
          }
          className="h-10 rounded-lg border border-border bg-card px-3 text-sm text-foreground hover:border-border-strong"
        >
          Exportar CSV
        </button>
      </div>

      <p className="text-xs text-muted-foreground">{list.length} sessões</p>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr className="border-b border-border">
              <th className="px-3 py-2.5 font-medium">Entrada</th>
              <th className="px-3 py-2.5 font-medium">Quem</th>
              <th className="px-3 py-2.5 font-medium">Origem</th>
              <th className="px-3 py-2.5 font-medium">Aparelho</th>
              <th className="px-3 py-2.5 text-right font-medium">Tempo ativo</th>
              <th className="px-3 py-2.5 font-medium">Rolagem</th>
              <th className="px-3 py-2.5 text-right font-medium">Cliques</th>
              <th className="px-3 py-2.5 font-medium">Chegou até</th>
              <th className="px-3 py-2.5 font-medium">Sinais</th>
            </tr>
          </thead>
          <tbody>
            {list.slice(0, limit).map((s) => {
              const l = leadFor(s);
              const o = s.order_id ? orderById.get(s.order_id) : undefined;
              return (
                <tr
                  key={s.id}
                  onClick={() => onOpen(s.id)}
                  className="cursor-pointer border-b border-border/50 last:border-0 hover:bg-white/[0.03]"
                >
                  <td className="whitespace-nowrap px-3 py-2.5 text-secondary-foreground tabular-nums">
                    {fmtDate(s.started_at)}
                  </td>
                  <td className="px-3 py-2.5">
                    {l ? (
                      <span>
                        <span className="block font-medium text-foreground">
                          {l.nome || "Lead sem nome"}
                        </span>
                        <span className="text-xs text-secondary-foreground">{l.whatsapp}</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        Anônimo · {s.visitor_id.slice(0, 6)}
                      </span>
                    )}
                  </td>
                  <td className="max-w-[200px] px-3 py-2.5">
                    <span className="block truncate text-foreground">{sourceOf(s)}</span>
                    {s.utm_campaign ? (
                      <span className="block truncate text-xs text-muted-foreground">
                        {s.utm_campaign}
                      </span>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-secondary-foreground">
                    {s.device} · {s.browser}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-foreground">
                    {fmtDuration(s.active_ms)}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="flex items-center gap-2 tabular-nums">
                      <span className="relative h-1.5 w-16 rounded-full bg-white/8">
                        <span
                          className="absolute inset-y-0 left-0 rounded-full bg-primary"
                          style={{ width: `${s.max_scroll_pct}%` }}
                        />
                      </span>
                      <span className="text-xs text-secondary-foreground">{s.max_scroll_pct}%</span>
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{s.clicks}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs text-secondary-foreground">
                    {s.furthest_section
                      ? (SECTION_LABELS[s.furthest_section] ?? s.furthest_section)
                      : "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="flex flex-wrap gap-1">
                      {s.purchased ||
                      (o && ["pago", "em_producao", "enviado", "entregue"].includes(o.status)) ? (
                        <Pill tone="ok">Comprou</Pill>
                      ) : null}
                      {s.checkout_started && !s.purchased ? (
                        <Pill tone="warn">Checkout</Pill>
                      ) : null}
                      {s.configured && !s.checkout_started ? (
                        <Pill tone="info">Configurou</Pill>
                      ) : null}
                      {s.whatsapp_clicked ? <Pill tone="ok">WhatsApp</Pill> : null}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!list.length && <Empty>Nenhuma sessão com esse filtro.</Empty>}
      </div>
      {list.length > limit && (
        <button
          type="button"
          onClick={() => setLimit((n) => n + 200)}
          className="mx-auto h-10 rounded-lg border border-border px-4 text-sm text-foreground hover:border-border-strong"
        >
          Mostrar mais
        </button>
      )}

      <Dialog.Root open={!!open} onOpenChange={(o) => !o && onOpen(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="checkout-overlay fixed inset-0 z-50 bg-black/60" />
          <Dialog.Content
            aria-describedby={undefined}
            className="checkout-panel fixed inset-y-0 right-0 z-50 flex w-full max-w-[980px] flex-col border-l border-border-strong bg-background"
          >
            {open && (
              <SessionDetail
                session={open}
                lead={leadFor(open)}
                order={open.order_id ? orderById.get(open.order_id) : undefined}
                siblings={sessions.filter(
                  (s) => s.visitor_id === open.visitor_id && s.id !== open.id,
                )}
                onOpen={onOpen}
              />
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

function tFmt(ms: number | null) {
  if (ms == null) return "";
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function describeEvent(e: TrackEvent) {
  const d = e.data ?? {};
  switch (e.type) {
    case "scroll_depth":
      return `${d.pct}% da página`;
    case "section_view":
      return SECTION_LABELS[e.section ?? ""] ?? e.section ?? "";
    case "click":
    case "whatsapp_click":
    case "rage_click":
      return `“${String(d.label ?? "").slice(0, 70)}”${e.section ? ` em ${SECTION_LABELS[e.section] ?? e.section}` : ""}${d.dead ? " · área não clicável" : ""}`;
    case "configurator_change":
      return `${d.mode === "custom" ? "Monte o seu" : "Kit completo"} · ${d.largura} × ${d.comprimento} cm${d.preco ? ` · R$ ${Number(d.preco).toLocaleString("pt-BR")}` : ` · ${d.status ?? ""}`}`;
    case "field_focus":
    case "field_filled":
      return String(d.field ?? "");
    case "checkout_step":
      return String(d.step ?? "");
    case "payment_method":
    case "payment_created":
      return [d.metodo, d.status, d.detalhe].filter(Boolean).join(" · ");
    case "checkout_error":
      return String(d.message ?? "");
    case "purchase":
      return `Pedido #${d.pedido} · R$ ${Number(d.valor ?? 0).toLocaleString("pt-BR")}`;
    case "page_hide":
      return `ativo ${fmtDuration(Number(d.active_ms ?? 0))} · rolou ${d.max_scroll}%`;
    case "video_play":
      return String(d.src ?? "");
    default:
      return d && Object.keys(d).length ? JSON.stringify(d).slice(0, 90) : "";
  }
}

const EVENT_TONE: Record<string, string> = {
  purchase: "bg-success",
  whatsapp_click: "bg-success",
  checkout_open: "bg-primary",
  checkout_order_created: "bg-primary",
  payment_created: "bg-primary",
  configurator_change: "bg-sky-400",
  lead_saved: "bg-success",
  rage_click: "bg-danger",
  checkout_error: "bg-danger",
};

function SessionDetail({
  session: s,
  lead,
  order,
  siblings,
  onOpen,
}: {
  session: Session;
  lead?: Lead;
  order?: Order;
  siblings: Session[];
  onOpen: (id: string) => void;
}) {
  const [events, setEvents] = useState<TrackEvent[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<"timeline" | "mapa">("timeline");
  const [hideScroll, setHideScroll] = useState(true);

  useEffect(() => {
    setEvents(null);
    setErr(null);
    fetchEvents(s.id)
      .then(setEvents)
      .catch((e) => setErr(e.message));
  }, [s.id]);

  const sectionRows = SECTION_ORDER.filter((k) => s.sections && k in s.sections).map((k) => ({
    k,
    ms: s.sections[k],
  }));
  const maxMs = Math.max(1, ...sectionRows.map((r) => r.ms));
  const clicks = (events ?? []).filter(
    (e) => ["click", "whatsapp_click", "rage_click"].includes(e.type) && e.y != null,
  );
  const shown = (events ?? []).filter(
    (e) => !(hideScroll && (e.type === "scroll_depth" || e.type === "field_focus")),
  );
  const mapWidth =
    s.device === "mobile"
      ? Math.min(430, s.viewport_w ?? 390)
      : Math.max(1024, Math.min(1440, s.viewport_w ?? 1280));

  return (
    <>
      <header className="flex items-start gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0 flex-1">
          <Dialog.Title className="text-lg font-semibold text-foreground">
            {lead?.nome || (lead ? "Lead sem nome" : `Visitante ${s.visitor_id.slice(0, 6)}`)}
          </Dialog.Title>
          <p className="mt-0.5 text-xs text-secondary-foreground">
            {fmtDate(s.started_at, true)} · {s.device} · {s.os} · {s.browser} · tela {s.viewport_w}×
            {s.viewport_h}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {s.purchased ? <Pill tone="ok">Comprou</Pill> : null}
            {s.checkout_started ? <Pill tone="warn">Abriu checkout</Pill> : null}
            {s.configured ? <Pill tone="info">Configurou</Pill> : null}
            {s.whatsapp_clicked ? <Pill tone="ok">Clicou no WhatsApp</Pill> : null}
            {siblings.length ? (
              <Pill>{siblings.length + 1}ª visita deste visitante</Pill>
            ) : (
              <Pill>1ª visita</Pill>
            )}
          </div>
        </div>
        {lead?.whatsapp && (
          <a
            href={waLink(lead.whatsapp)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-whatsapp px-3 text-sm font-semibold text-whatsapp-foreground"
          >
            WhatsApp <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        )}
        <Dialog.Close
          className="grid h-10 w-10 place-items-center rounded-full text-foreground hover:bg-card"
          aria-label="Fechar"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </Dialog.Close>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ["Tempo ativo", fmtDuration(s.active_ms)],
            [
              "Duração total",
              fmtDuration(new Date(s.last_seen_at).getTime() - new Date(s.started_at).getTime()),
            ],
            ["Rolagem máxima", `${s.max_scroll_pct}%`],
            ["Cliques", String(s.clicks)],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl border border-border bg-card px-3 py-2.5">
              <p className="text-xs text-muted-foreground">{k}</p>
              <p className="text-lg font-semibold tabular-nums text-foreground">{v}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Panel title="Tempo em cada seção">
            {sectionRows.length ? (
              sectionRows.map((r) => (
                <HBar
                  key={r.k}
                  label={SECTION_LABELS[r.k] ?? r.k}
                  value={r.ms}
                  max={maxMs}
                  display={fmtDuration(r.ms)}
                />
              ))
            ) : (
              <Empty>Sem seções registradas.</Empty>
            )}
          </Panel>
          <Panel title="Origem e contato">
            <dl className="grid gap-2 text-sm">
              {[
                ["Fonte", sourceOf(s)],
                ["Campanha", s.utm_campaign],
                ["Conteúdo / anúncio", s.utm_content],
                ["Termo", s.utm_term],
                ["Referência", s.referrer],
                ["Entrou por", s.landing_url],
                [
                  "Lead",
                  lead ? `${lead.nome ?? ""} · ${lead.whatsapp ?? ""} · ${lead.email ?? ""}` : null,
                ],
                ["Cidade", lead ? [lead.cidade, lead.estado].filter(Boolean).join("/") : null],
                ["Projeto", lead?.tipo_projeto],
              ]
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[8rem_1fr] gap-2">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="break-all text-foreground">{v}</dd>
                  </div>
                ))}
            </dl>
            {lead?.foto_url && (
              <img
                src={lead.foto_url}
                alt="Foto enviada pelo lead"
                className="mt-3 h-32 rounded-lg object-cover"
              />
            )}
          </Panel>
        </div>

        {order && (
          <Panel title={`Pedido #${order.number}`} className="mt-4">
            <p className="text-sm text-foreground">
              <Pill tone={ORDER_STATUS[order.status]?.tone}>
                {ORDER_STATUS[order.status]?.label ?? order.status}
              </Pill>{" "}
              {brl(order.total_cents)} · {order.width_cm}×{order.depth_cm} cm ·{" "}
              {order.payment_method ?? "sem pagamento"}
            </p>
          </Panel>
        )}

        {siblings.length > 0 && (
          <Panel title="Outras visitas deste visitante" className="mt-4">
            <ul className="grid gap-1 text-sm">
              {siblings.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => onOpen(o.id)}
                    className="text-left text-primary hover:underline"
                  >
                    {fmtDate(o.started_at)} · {fmtDuration(o.active_ms)} ativo · {o.max_scroll_pct}%
                    · {sourceOf(o)}
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
        )}

        <div className="mt-5 flex items-center gap-3">
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              ["timeline", `Linha do tempo${events ? ` (${events.length})` : ""}`],
              ["mapa", `Mapa de cliques (${clicks.length})`],
            ]}
          />
          {tab === "timeline" && (
            <label className="flex items-center gap-2 text-xs text-secondary-foreground">
              <input
                type="checkbox"
                checked={hideScroll}
                onChange={(e) => setHideScroll(e.target.checked)}
                className="accent-[var(--primary)]"
              />
              Ocultar rolagem e foco
            </label>
          )}
        </div>

        <div className="mt-3">
          {err && <p className="text-sm text-danger">{err}</p>}
          {!events && !err && <div className="skeleton h-40 rounded-xl" />}
          {events && tab === "timeline" && (
            <ol className="relative ml-2 border-l border-border">
              {shown.map((e) => (
                <li key={e.id} className="relative py-1.5 pl-5">
                  <span
                    className={cn(
                      "absolute -left-[5px] top-3 h-2.5 w-2.5 rounded-full",
                      EVENT_TONE[e.type] ?? "bg-border-strong",
                    )}
                  />
                  <span className="mr-2 font-mono text-xs text-muted-foreground tabular-nums">
                    {tFmt(e.t_ms)}
                  </span>
                  <span
                    className={cn(
                      "text-sm",
                      e.type === "purchase" ? "font-semibold text-success" : "text-foreground",
                    )}
                  >
                    {EVENT_LABELS[e.type] ?? e.type}
                  </span>
                  <span className="ml-2 text-sm text-secondary-foreground">{describeEvent(e)}</span>
                </li>
              ))}
              {!shown.length && <Empty>Sem eventos.</Empty>}
            </ol>
          )}
          {events && tab === "mapa" && (
            <ClickMap
              width={mapWidth}
              clicks={clicks.map((c) => ({
                x: c.x ?? 0,
                y: c.y ?? 0,
                type: c.type,
                page_h: s.page_h,
                label: String(c.data?.label ?? ""),
              }))}
            />
          )}
        </div>
      </div>
    </>
  );
}
