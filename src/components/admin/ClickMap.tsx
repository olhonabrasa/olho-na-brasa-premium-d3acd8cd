import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

export type MapClick = {
  x: number;
  y: number;
  type: string;
  page_h?: number | null;
  label?: string;
};

/**
 * Renderiza a LP de verdade num iframe (modo ?heatmap=1: sem rastreamento, sem
 * animação de entrada, alturas em vh travadas) e desenha os cliques por cima.
 * x é relativo à largura (0-1); y é px do documento, reescalado pela altura
 * da página na sessão original.
 */
export function ClickMap({
  clicks,
  width,
  maxHeight = 720,
}: {
  clicks: MapClick[];
  width: number;
  maxHeight?: number;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [containerW, setContainerW] = useState(600);
  const [docH, setDocH] = useState<number | null>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setContainerW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    setDocH(null);
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const d = e.data as { type?: string; height?: number; width?: number };
      if (d?.type === "onb-heatmap-height" && d.width === width && typeof d.height === "number")
        setDocH(d.height);
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [width]);

  const scale = Math.min(1, containerW / width);
  const H = docH ?? 9000;

  return (
    <div
      ref={wrap}
      className="relative overflow-y-auto rounded-xl border border-border bg-background"
      style={{ maxHeight }}
    >
      {!docH && (
        <div className="absolute inset-x-0 top-10 z-10 flex justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> Carregando a página…
        </div>
      )}
      <div style={{ width: width * scale, height: H * scale }} className="relative mx-auto">
        <div
          style={{ width, height: H, transform: `scale(${scale})`, transformOrigin: "0 0" }}
          className="absolute left-0 top-0"
        >
          <iframe
            key={width}
            title="Página para o mapa de cliques"
            src={`/?heatmap=1&notrack=1&w=${width}`}
            width={width}
            height={H}
            className="pointer-events-none block border-0"
            sandbox="allow-scripts allow-same-origin"
          />
          <div className="absolute inset-0">
            {docH &&
              clicks.map((c, i) => {
                const y = c.page_h ? (c.y / c.page_h) * H : c.y;
                const tone =
                  c.type === "rage_click"
                    ? "oklch(0.69 0.2 25)"
                    : c.type === "whatsapp_click"
                      ? "oklch(0.77 0.23 149)"
                      : "oklch(0.69 0.205 48.5)";
                return (
                  <span
                    key={i}
                    title={c.label}
                    className="absolute block rounded-full"
                    style={{
                      left: c.x * width - 9,
                      top: y - 9,
                      width: 18,
                      height: 18,
                      background: `color-mix(in oklab, ${tone} 45%, transparent)`,
                      boxShadow: `0 0 0 2px ${tone}`,
                      mixBlendMode: "screen",
                    }}
                  />
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}
