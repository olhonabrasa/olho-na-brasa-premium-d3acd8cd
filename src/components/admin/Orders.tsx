import { useEffect, useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { brl } from "@/lib/pricing";
import { downloadCsv, fmtDate, ORDER_STATUS, waLink, type Order } from "./data";
import { Empty, Panel, Pill, Segmented } from "./ui";

type OrderEvent = {
  id: number;
  created_at: string;
  kind: string;
  detail: Record<string, unknown> | null;
};

const EDITABLE = ["pago", "em_producao", "enviado", "entregue", "cancelado", "reembolsado"];

export function Orders({
  orders,
  onChanged,
  onOpenSession,
}: {
  orders: Order[];
  onChanged: () => void;
  onOpenSession: (id: string) => void;
}) {
  const [filter, setFilter] = useState<"todos" | "pagos" | "pendentes">("todos");
  const [openId, setOpenId] = useState<string | null>(null);

  const list = useMemo(
    () =>
      orders.filter((o) =>
        filter === "pagos"
          ? ["pago", "em_producao", "enviado", "entregue"].includes(o.status)
          : filter === "pendentes"
            ? ["aguardando_pagamento", "em_analise"].includes(o.status)
            : true,
      ),
    [orders, filter],
  );
  const open = openId ? orders.find((o) => o.id === openId) : null;

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="grid content-start gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              ["todos", "Todos"],
              ["pagos", "Pagos"],
              ["pendentes", "Aguardando"],
            ]}
          />
          <button
            type="button"
            onClick={() =>
              downloadCsv(
                `pedidos-${new Date().toISOString().slice(0, 10)}.csv`,
                list.map((o) => ({
                  numero: o.number,
                  data: o.created_at,
                  status: o.status,
                  cliente: o.customer.nome,
                  whatsapp: o.customer.whatsapp,
                  email: o.customer.email,
                  cidade: `${o.address.cidade}/${o.address.uf}`,
                  medida: `${o.width_cm}x${o.depth_cm}`,
                  faixa: `${o.tier_width_cm}x${o.tier_depth_cm}`,
                  itens: o.items.map((i) => `${i.qty}x ${i.name} ${i.size ?? ""}`).join(" + "),
                  total: o.total_cents / 100,
                  pago: (o.paid_cents ?? 0) / 100,
                  pagamento: o.payment_method,
                  parcelas: o.installments,
                  mp_id: o.mp_payment_id,
                })),
              )
            }
            className="ml-auto h-10 rounded-lg border border-border bg-card px-3 text-sm text-foreground hover:border-border-strong"
          >
            Exportar CSV
          </button>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-3 py-2.5 font-medium">#</th>
                <th className="px-3 py-2.5 font-medium">Data</th>
                <th className="px-3 py-2.5 font-medium">Cliente</th>
                <th className="px-3 py-2.5 font-medium">Medida</th>
                <th className="px-3 py-2.5 text-right font-medium">Total</th>
                <th className="px-3 py-2.5 font-medium">Pagamento</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {list.map((o) => (
                <tr
                  key={o.id}
                  onClick={() => setOpenId(o.id)}
                  className={`cursor-pointer border-b border-border/50 last:border-0 hover:bg-white/[0.03] ${openId === o.id ? "bg-white/[0.04]" : ""}`}
                >
                  <td className="px-3 py-2.5 font-medium tabular-nums text-foreground">
                    {o.number}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-secondary-foreground tabular-nums">
                    {fmtDate(o.created_at)}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="block text-foreground">{o.customer.nome}</span>
                    <span className="text-xs text-muted-foreground">
                      {o.address.cidade}/{o.address.uf}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-secondary-foreground">
                    {o.width_cm}×{o.depth_cm} {o.mode === "custom" ? "· avulso" : ""}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-foreground">
                    {brl(o.paid_cents ?? o.total_cents)}
                  </td>
                  <td className="px-3 py-2.5 text-secondary-foreground">
                    {o.payment_method ?? "—"}
                    {o.installments && o.installments > 1 ? ` ${o.installments}x` : ""}
                  </td>
                  <td className="px-3 py-2.5">
                    <Pill tone={ORDER_STATUS[o.status]?.tone}>
                      {ORDER_STATUS[o.status]?.label ?? o.status}
                    </Pill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!list.length && <Empty>Nenhum pedido ainda.</Empty>}
        </div>
      </div>
      {open ? (
        <OrderDetail
          key={open.id}
          order={open}
          onChanged={onChanged}
          onOpenSession={onOpenSession}
        />
      ) : (
        <Panel>
          <Empty>Selecione um pedido para ver os detalhes.</Empty>
        </Panel>
      )}
    </div>
  );
}

function OrderDetail({
  order: o,
  onChanged,
  onOpenSession,
}: {
  order: Order;
  onChanged: () => void;
  onOpenSession: (id: string) => void;
}) {
  const [events, setEvents] = useState<OrderEvent[]>([]);
  const [status, setStatus] = useState(o.status);
  const [tracking, setTracking] = useState(o.tracking_code ?? "");
  const [notes, setNotes] = useState(o.admin_notes ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("order_events")
      .select("id,created_at,kind,detail")
      .eq("order_id", o.id)
      .order("created_at")
      .then(({ data }) => setEvents((data as OrderEvent[]) ?? []));
  }, [o.id]);

  const save = async () => {
    setSaving(true);
    setMsg(null);
    const { error } = await supabase
      .from("orders")
      .update({ status, tracking_code: tracking || null, admin_notes: notes || null })
      .eq("id", o.id);
    if (!error && status !== o.status) {
      await supabase
        .from("order_events")
        .insert({ order_id: o.id, kind: "status_manual", detail: { de: o.status, para: status } });
    }
    setSaving(false);
    setMsg(error ? error.message : "Salvo.");
    if (!error) onChanged();
  };

  return (
    <Panel
      title={`Pedido #${o.number}`}
      action={
        <Pill tone={ORDER_STATUS[o.status]?.tone}>{ORDER_STATUS[o.status]?.label ?? o.status}</Pill>
      }
    >
      <div className="grid gap-4 text-sm">
        <div>
          <p className="font-medium text-foreground">{o.customer.nome}</p>
          <p className="text-secondary-foreground">
            {o.customer.email} · CPF{" "}
            {o.customer.cpf.replace(/^(\d{3})\d{5}(\d{3})$/, "$1.***.**$2")}
          </p>
          <a
            href={waLink(o.customer.whatsapp)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-success hover:underline"
          >
            {o.customer.whatsapp} <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
          <p className="mt-2 text-secondary-foreground">
            {o.address.rua}, {o.address.numero}
            {o.address.complemento ? ` · ${o.address.complemento}` : ""} · {o.address.bairro} ·{" "}
            {o.address.cidade}/{o.address.uf} · CEP {o.address.cep}
          </p>
        </div>

        <div className="rounded-xl border border-border p-3">
          <p className="text-secondary-foreground">
            Medida informada{" "}
            <strong className="text-foreground">
              {o.width_cm} × {o.depth_cm} cm
            </strong>{" "}
            · fabricar na faixa{" "}
            <strong className="text-primary">
              {o.tier_width_cm} × {o.tier_depth_cm || "—"} cm
            </strong>
          </p>
          <ul className="mt-2 space-y-1">
            {o.items.map((i) => (
              <li key={i.item_id} className="flex justify-between tabular-nums">
                <span className="text-foreground">
                  {i.qty}× {i.name}{" "}
                  {i.size ? <span className="text-muted-foreground">· {i.size}</span> : null}
                </span>
                <span>{brl(i.total_cents)}</span>
              </li>
            ))}
            <li className="flex justify-between text-secondary-foreground tabular-nums">
              <span>Frete</span>
              <span>{o.shipping_cents ? brl(o.shipping_cents) : "grátis"}</span>
            </li>
            <li className="flex justify-between border-t border-border pt-1 font-semibold tabular-nums text-foreground">
              <span>Total {o.payment_method === "pix" ? "(Pix)" : ""}</span>
              <span>{brl(o.payment_method === "pix" ? o.pix_total_cents : o.total_cents)}</span>
            </li>
          </ul>
          {o.mp_payment_id && (
            <p className="mt-2 text-xs text-muted-foreground">
              Mercado Pago #{o.mp_payment_id} · {o.mp_status} · {o.mp_status_detail}
            </p>
          )}
        </div>

        <div className="grid gap-3">
          <label className="grid gap-1 text-xs text-muted-foreground">
            Status
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-10 rounded-lg border border-border bg-background px-2 text-sm text-foreground"
            >
              {[o.status, ...EDITABLE.filter((s) => s !== o.status)].map((s) => (
                <option key={s} value={s}>
                  {ORDER_STATUS[s]?.label ?? s}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs text-muted-foreground">
            Código de rastreio
            <input
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
            />
          </label>
          <label className="grid gap-1 text-xs text-muted-foreground">
            Observações internas
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {saving ? "Salvando…" : "Salvar"}
            </button>
            {o.session_id && (
              <button
                type="button"
                onClick={() => onOpenSession(o.session_id!)}
                className="text-sm text-primary hover:underline"
              >
                Ver a navegação deste cliente
              </button>
            )}
            {msg && <span className="text-xs text-secondary-foreground">{msg}</span>}
          </div>
        </div>

        <div>
          <p className="mb-1 text-xs text-muted-foreground">Histórico</p>
          <ol className="space-y-1 text-xs">
            {events.map((e) => (
              <li key={e.id} className="text-secondary-foreground">
                <span className="tabular-nums text-muted-foreground">{fmtDate(e.created_at)}</span>{" "}
                · <span className="text-foreground">{e.kind}</span>{" "}
                {e.detail ? JSON.stringify(e.detail).slice(0, 120) : ""}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Panel>
  );
}
