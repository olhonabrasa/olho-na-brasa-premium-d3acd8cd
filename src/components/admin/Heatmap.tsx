import { useEffect, useMemo, useState } from "react";

import { ClickMap } from "./ClickMap";
import { fetchClicks, SECTION_LABELS, type Session, type TrackEvent } from "./data";
import { Empty, HBar, Panel, Segmented } from "./ui";

type Click = Pick<TrackEvent, "session_id" | "type" | "x" | "y" | "section" | "data" | "ts">;

export function Heatmap({ sessions, fromIso }: { sessions: Session[]; fromIso: string }) {
  const [clicks, setClicks] = useState<Click[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [device, setDevice] = useState<"mobile" | "desktop">("mobile");

  useEffect(() => {
    setClicks(null);
    fetchClicks(fromIso)
      .then(setClicks)
      .catch((e) => setErr(e.message));
  }, [fromIso]);

  const byId = useMemo(() => new Map(sessions.map((s) => [s.id, s])), [sessions]);
  const filtered = useMemo(
    () =>
      (clicks ?? []).filter((c) => {
        const s = byId.get(c.session_id);
        const mobile = s ? s.device === "mobile" : Number(c.data?.vw ?? 1000) < 768;
        return device === "mobile" ? mobile : !mobile;
      }),
    [clicks, byId, device],
  );

  const top = useMemo(() => {
    const m = new Map<string, number>();
    filtered.forEach((c) => {
      const k = `${String(c.data?.label ?? "?").slice(0, 60)}${c.section ? `  ·  ${SECTION_LABELS[c.section] ?? c.section}` : ""}`;
      m.set(k, (m.get(k) ?? 0) + 1);
    });
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
  }, [filtered]);

  const dead = filtered.filter((c) => c.data?.dead).length;
  const rage = filtered.filter((c) => c.type === "rage_click").length;

  const scrollReach = useMemo(() => {
    const ss = sessions.filter((s) =>
      device === "mobile" ? s.device === "mobile" : s.device !== "mobile",
    );
    return [10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((p) => ({
      p,
      v: ss.length ? ss.filter((s) => s.max_scroll_pct >= p).length / ss.length : 0,
    }));
  }, [sessions, device]);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          value={device}
          onChange={setDevice}
          options={[
            ["mobile", "Celular"],
            ["desktop", "Computador"],
          ]}
        />
        <p className="text-xs text-muted-foreground">
          {filtered.length} cliques · {rage} repetidos (frustração) · {dead} em áreas não clicáveis
        </p>
      </div>
      {err && <p className="text-sm text-danger">{err}</p>}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Panel title="Onde clicam na página">
          {!clicks ? (
            <div className="skeleton h-96 rounded-xl" />
          ) : filtered.length ? (
            <ClickMap
              width={device === "mobile" ? 390 : 1280}
              clicks={filtered.map((c) => ({
                x: c.x ?? 0,
                y: c.y ?? 0,
                type: c.type,
                page_h: byId.get(c.session_id)?.page_h,
                label: String(c.data?.label ?? ""),
              }))}
              maxHeight={900}
            />
          ) : (
            <Empty>Sem cliques neste período.</Empty>
          )}
          <p className="mt-3 flex flex-wrap gap-4 text-xs text-secondary-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-primary" /> Clique
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-whatsapp" /> WhatsApp
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-danger" /> Cliques repetidos
            </span>
          </p>
        </Panel>
        <div className="grid content-start gap-4">
          <Panel title="Mais clicados">
            {top.length ? (
              top.map(([k, v]) => (
                <HBar key={k} label={k} value={v} max={top[0][1]} display={String(v)} />
              ))
            ) : (
              <Empty>—</Empty>
            )}
          </Panel>
          <Panel title="Quantos chegam em cada ponto da página">
            {scrollReach.map((r) => (
              <HBar
                key={r.p}
                label={`${r.p}% da página`}
                value={r.v}
                max={1}
                display={`${Math.round(r.v * 100)}%`}
              />
            ))}
          </Panel>
        </div>
      </div>
    </div>
  );
}
