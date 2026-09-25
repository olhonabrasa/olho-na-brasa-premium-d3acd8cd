import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { brl } from "@/lib/pricing";
import {
  fmtDuration,
  SECTION_LABELS,
  SECTION_ORDER,
  sourceOf,
  type Lead,
  type Order,
  type Session,
} from "./data";
import { Empty, HBar, Kpi, Panel } from "./ui";

const PAID = new Set(["pago", "em_producao", "enviado", "entregue"]);

function median(values: number[]) {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function Overview({
  sessions,
  leads,
  orders,
  fromIso,
}: {
  sessions: Session[];
  leads: Lead[];
  orders: Order[];
  fromIso: string;
}) {
  const periodOrders = orders.filter((o) => o.created_at >= fromIso);
  const paid = periodOrders.filter((o) => PAID.has(o.status));
  const revenue = paid.reduce((s, o) => s + (o.paid_cents ?? o.total_cents), 0);

  const stats = useMemo(() => {
    const n = sessions.length;
    const visitors = new Set(sessions.map((s) => s.visitor_id)).size;
    const engaged = sessions.filter((s) => s.active_ms >= 10_000);
    const bounce = n
      ? sessions.filter((s) => s.active_ms < 10_000 && s.max_scroll_pct < 25).length / n
      : 0;
    return {
      n,
      visitors,
      medianActive: median(sessions.map((s) => s.active_ms)),
      avgScroll: n ? Math.round(sessions.reduce((a, s) => a + s.max_scroll_pct, 0) / n) : 0,
      engaged: engaged.length,
      bounce,
    };
  }, [sessions]);

  const funnel = useMemo(() => {
    const n = sessions.length;
    const steps: [string, number][] = [
      ["Entraram na página", n],
      ["Rolaram 50% ou mais", sessions.filter((s) => s.max_scroll_pct >= 50).length],
      ["Viram o configurador", sessions.filter((s) => "configurador" in (s.sections ?? {})).length],
      ["Mexeram na medida", sessions.filter((s) => s.configured).length],
      ["Abriram o checkout", sessions.filter((s) => s.checkout_started).length],
      ["Clicaram no WhatsApp", sessions.filter((s) => s.whatsapp_clicked).length],
      ["Viraram lead", sessions.filter((s) => s.lead_id).length],
      ["Compraram", sessions.filter((s) => s.purchased).length],
    ];
    return steps;
  }, [sessions]);

  const perDay = useMemo(() => {
    const map = new Map<string, { dia: string; sessoes: number; leads: number }>();
    const start = new Date(fromIso);
    for (let d = new Date(start); d <= new Date(); d.setDate(d.getDate() + 1)) {
      const k = d.toISOString().slice(0, 10);
      map.set(k, { dia: k.slice(8, 10) + "/" + k.slice(5, 7), sessoes: 0, leads: 0 });
    }
    sessions.forEach((s) => {
      const k = new Date(s.started_at).toISOString().slice(0, 10);
      const row = map.get(k);
      if (row) row.sessoes++;
    });
    leads.forEach((l) => {
      const row = map.get(new Date(l.created_at).toISOString().slice(0, 10));
      if (row) row.leads++;
    });
    return [...map.values()];
  }, [sessions, leads, fromIso]);

  const sectionStats = useMemo(() => {
    const n = sessions.length || 1;
    return SECTION_ORDER.filter((k) => k !== "checkout").map((k) => {
      const seen = sessions.filter((s) => s.sections && k in s.sections);
      const avg = seen.length
        ? seen.reduce((a, s) => a + (s.sections[k] ?? 0), 0) / seen.length
        : 0;
      return { key: k, label: SECTION_LABELS[k], reach: seen.length / n, avg };
    });
  }, [sessions]);

  const sources = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        sessions: number;
        active: number[];
        configured: number;
        leads: number;
        buys: number;
      }
    >();
    sessions.forEach((s) => {
      const key = `${sourceOf(s)}${s.utm_campaign ? " / " + s.utm_campaign : ""}`;
      const row = map.get(key) ?? {
        key,
        sessions: 0,
        active: [],
        configured: 0,
        leads: 0,
        buys: 0,
      };
      row.sessions++;
      row.active.push(s.active_ms);
      if (s.configured) row.configured++;
      if (s.lead_id) row.leads++;
      if (s.purchased) row.buys++;
      map.set(key, row);
    });
    return [...map.values()].sort((a, b) => b.sessions - a.sessions).slice(0, 15);
  }, [sessions]);

  const devices = useMemo(() => {
    const map = new Map<string, number>();
    sessions.forEach((s) =>
      map.set(
        `${s.device ?? "?"} · ${s.browser ?? "?"}`,
        (map.get(`${s.device ?? "?"} · ${s.browser ?? "?"}`) ?? 0) + 1,
      ),
    );
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [sessions]);

  if (!sessions.length && !leads.length) {
    return (
      <Empty>
        Nenhuma visita registrada neste período. O rastreamento começa a contar assim que a nova
        versão da LP for publicada.
      </Empty>
    );
  }

  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 1000) / 10}%` : "0%");

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <Kpi label="Sessões" value={String(stats.n)} hint={`${stats.visitors} visitantes`} />
        <Kpi label="Tempo ativo (mediana)" value={fmtDuration(stats.medianActive)} />
        <Kpi label="Rolagem média" value={`${stats.avgScroll}%`} />
        <Kpi
          label="Saíram sem interagir"
          value={pct(stats.bounce * 100, 100)}
          hint="<10s e <25% de rolagem"
        />
        <Kpi
          label="Leads"
          value={String(leads.length)}
          hint={pct(leads.length, stats.n) + " das sessões"}
        />
        <Kpi
          label="Pedidos pagos"
          value={String(paid.length)}
          hint={`${periodOrders.length} criados`}
        />
        <Kpi
          label="Receita paga"
          value={brl(revenue)}
          hint={paid.length ? `ticket ${brl(Math.round(revenue / paid.length))}` : undefined}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Funil da LP">
          {funnel.map(([label, v], i) => (
            <HBar
              key={label}
              label={label}
              value={v}
              max={funnel[0][1]}
              display={String(v)}
              sub={i ? pct(v, funnel[0][1]) : undefined}
            />
          ))}
        </Panel>

        <Panel title="Sessões por dia">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={perDay} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                <CartesianGrid vertical={false} stroke="oklch(0.27 0 0)" />
                <XAxis
                  dataKey="dia"
                  tick={{ fill: "oklch(0.57 0 0)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                  minTickGap={16}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "oklch(0.57 0 0)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "oklch(1 0 0 / 0.04)" }}
                  contentStyle={{
                    background: "oklch(0.2 0 0)",
                    border: "1px solid oklch(0.34 0 0)",
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "oklch(0.985 0 0)" }}
                  formatter={(v: number, k: string) => [v, k === "sessoes" ? "Sessões" : "Leads"]}
                />
                <Bar
                  dataKey="sessoes"
                  fill="oklch(0.69 0.205 48.5)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Até onde chegam (seções)">
          <p className="mb-2 text-xs text-muted-foreground">
            % das sessões que viram cada seção e tempo médio com ela na tela.
          </p>
          {sectionStats.map((s) => (
            <HBar
              key={s.key}
              label={s.label}
              value={s.reach}
              max={1}
              display={`${Math.round(s.reach * 100)}%`}
              sub={s.avg ? fmtDuration(s.avg) : undefined}
            />
          ))}
        </Panel>

        <Panel title="Dispositivos">
          {devices.map(([k, v]) => (
            <HBar
              key={k}
              label={k}
              value={v}
              max={devices[0]?.[1] ?? 1}
              display={String(v)}
              sub={pct(v, stats.n)}
            />
          ))}
        </Panel>
      </div>

      <Panel title="Origem das visitas">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-2 pr-3 font-medium">Fonte / campanha</th>
                <th className="py-2 pr-3 text-right font-medium">Sessões</th>
                <th className="py-2 pr-3 text-right font-medium">Tempo mediano</th>
                <th className="py-2 pr-3 text-right font-medium">Configuraram</th>
                <th className="py-2 pr-3 text-right font-medium">Leads</th>
                <th className="py-2 text-right font-medium">Compras</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {sources.map((r) => (
                <tr key={r.key} className="border-t border-border/60">
                  <td className="max-w-[320px] truncate py-2 pr-3 text-foreground" title={r.key}>
                    {r.key}
                  </td>
                  <td className="py-2 pr-3 text-right">{r.sessions}</td>
                  <td className="py-2 pr-3 text-right">{fmtDuration(median(r.active))}</td>
                  <td className="py-2 pr-3 text-right">{pct(r.configured, r.sessions)}</td>
                  <td className="py-2 pr-3 text-right">{r.leads}</td>
                  <td className="py-2 text-right">{r.buys}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
