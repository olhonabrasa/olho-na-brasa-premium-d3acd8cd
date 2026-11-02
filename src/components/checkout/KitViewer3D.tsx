import { useEffect, useRef, useState, type ReactNode } from "react";
import { RotateCcw } from "lucide-react";

import { cn } from "@/lib/utils";
import { describeComposition, type Composicao } from "@/lib/kitComposition";
import type { Kit3DStage } from "./kit3d/stage";

type Props = {
  /** null = fora da faixa: mostra o fallback (planta da churrasqueira sem kit) */
  composition: Composicao | null;
  /** medida digitada pelo cliente, só para o aria-label */
  widthCm: number;
  depthCm: number;
  /** Blueprint: aparece até o 3D carregar, sem WebGL, fora da faixa ou se o 3D falhar */
  fallback: ReactNode;
};

let webglCache: boolean | null = null;
function hasWebGL() {
  if (webglCache !== null) return webglCache;
  try {
    const c = document.createElement("canvas");
    webglCache = !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    webglCache = false;
  }
  return webglCache;
}

/**
 * Visualizador 3D do kit. O módulo three.js só é baixado quando o configurador
 * chega perto da tela; até lá (e em qualquer falha) fica o fallback.
 */
export function KitViewer3D({ composition, widthCm, depthCm, fallback }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<Kit3DStage | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "failed">("idle");
  const [progress, setProgress] = useState(0);
  const [onScreen, setOnScreen] = useState(false);
  const [stats, setStats] = useState<string | null>(null);
  const compRef = useRef(composition);
  compRef.current = composition;

  // 1. carrega o 3D quando a seção chega perto da tela
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    if (!hasWebGL()) {
      setStatus("failed");
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        setOnScreen(e.isIntersecting);
        if (e.isIntersecting) setStatus((s) => (s === "idle" ? "loading" : s));
      },
      { rootMargin: "200px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // 2. cria o palco uma vez
  useEffect(() => {
    if (status !== "loading") return;
    let cancelled = false;
    const mobile = window.matchMedia("(max-width: 767px), (pointer: coarse)").matches;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    import("./kit3d/stage")
      .then(({ createKitStage }) => {
        if (cancelled || !wrapRef.current || !canvasRef.current) return;
        const stage = createKitStage(wrapRef.current, canvasRef.current, {
          mobile,
          reducedMotion,
          onProgress: (p) => setProgress(p),
        });
        // OrbitControls trava o toque; deixa a rolagem vertical da página passar.
        canvasRef.current.style.touchAction = "pan-y";
        stageRef.current = stage;
        if (compRef.current) stage.update(compRef.current);
        setStatus("ready");
      })
      .catch(() => !cancelled && setStatus("failed"));
    return () => {
      cancelled = true;
    };
  }, [status]);

  useEffect(() => () => stageRef.current?.dispose(), []);

  // 3. redesenha quando a composição muda
  const key = composition ? JSON.stringify(composition) : "";
  useEffect(() => {
    if (status === "ready" && composition) stageRef.current?.update(composition);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, status]);

  // 4. pausa fora da tela, com a aba oculta ou sem kit para mostrar
  useEffect(() => {
    const sync = () =>
      stageRef.current?.setActive(
        onScreen && document.visibilityState === "visible" && !!compRef.current,
      );
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, [onScreen, status, key]);

  // medição opcional: ?fps na URL mostra fps, tempo de quadro e chamadas de desenho
  useEffect(() => {
    if (status !== "ready" || !new URLSearchParams(window.location.search).has("fps")) return;
    const id = window.setInterval(() => {
      const s = stageRef.current?.stats();
      if (s)
        setStats(
          `${s.fps} fps · ${s.frameMs} ms · ${s.calls} draws · ${s.triangles.toLocaleString("pt-BR")} tri`,
        );
    }, 1000);
    return () => window.clearInterval(id);
  }, [status]);

  const show3D = status === "ready" && !!composition;
  const label = composition
    ? describeComposition(composition, widthCm, depthCm)
    : `Churrasqueira de ${widthCm} por ${depthCm} cm, fora da faixa padrão`;

  return (
    <div
      ref={wrapRef}
      className={cn(
        "kit3d relative overflow-hidden rounded-2xl",
        show3D && "bg-card ring-1 ring-border",
      )}
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={label}
        className={cn(
          "kit3d-canvas absolute inset-0 h-full w-full transition-opacity duration-300",
          show3D ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      {/* fallback fica por baixo até o 3D aparecer; define a altura do bloco */}
      <div
        className={cn(
          "transition-opacity duration-300",
          show3D ? "pointer-events-none opacity-0" : "opacity-100",
        )}
        aria-hidden={show3D}
      >
        {fallback}
      </div>

      {status === "loading" && (
        <div
          className="absolute inset-x-4 bottom-4 rounded-xl bg-background/85 px-3 py-2 text-xs text-secondary-foreground backdrop-blur"
          aria-live="polite"
        >
          Preparando o 3D do seu kit…
          <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-border">
            <span
              className="block h-full bg-primary transition-[width] duration-200"
              style={{ width: `${Math.max(8, progress * 100)}%` }}
            />
          </span>
        </div>
      )}

      {show3D && (
        <>
          <p className="pointer-events-none absolute left-3 top-3 rounded-full bg-background/70 px-2.5 py-1 text-[11px] text-secondary-foreground backdrop-blur">
            Arraste para girar · pinça para aproximar
          </p>
          <button
            type="button"
            onClick={() => stageRef.current?.resetView()}
            aria-label="Voltar o enquadramento"
            className="press absolute right-2 top-2 grid h-11 w-11 place-items-center rounded-full bg-background/70 text-foreground backdrop-blur hover:bg-background/90"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          </button>
        </>
      )}
      {stats && (
        <p
          className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-1 font-mono text-[11px] text-white"
          data-kit3d-stats
        >
          {stats}
        </p>
      )}
    </div>
  );
}
