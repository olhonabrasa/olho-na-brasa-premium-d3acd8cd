import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Panel({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-border bg-card", className)}>
      {title || action ? (
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          {title ? <h2 className="text-sm font-semibold text-foreground">{title}</h2> : <span />}
          {action}
        </header>
      ) : null}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-3.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-foreground tabular-nums">
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 text-xs text-secondary-foreground tabular-nums">{hint}</p>
      ) : null}
    </div>
  );
}

const TONES = {
  ok: "bg-success/15 text-success",
  warn: "bg-primary/15 text-primary",
  bad: "bg-danger/15 text-danger",
  info: "bg-sky-400/15 text-sky-300",
  muted: "bg-white/8 text-secondary-foreground",
} as const;

export function Pill({
  tone = "muted",
  children,
}: {
  tone?: keyof typeof TONES;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium",
        TONES[tone],
      )}
    >
      {children}
    </span>
  );
}

/** Barra horizontal simples: rótulo à esquerda, valor à direita. */
export function HBar({
  label,
  value,
  max,
  display,
  sub,
}: {
  label: string;
  value: number;
  max: number;
  display: string;
  sub?: string;
}) {
  const pct = max > 0 ? Math.max(0.5, (value / max) * 100) : 0;
  return (
    <div className="grid grid-cols-[minmax(7rem,11rem)_1fr_auto] items-center gap-3 py-1.5 text-sm">
      <span className="truncate text-secondary-foreground" title={label}>
        {label}
      </span>
      <span className="relative h-2.5">
        <span
          className="absolute inset-y-0 left-0 rounded-r-[4px] bg-primary"
          style={{ width: `${pct}%` }}
        />
      </span>
      <span className="min-w-16 text-right tabular-nums text-foreground">
        {display}
        {sub ? <span className="ml-1.5 text-xs text-muted-foreground">{sub}</span> : null}
      </span>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="px-4 py-10 text-center text-sm text-muted-foreground">{children}</div>;
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: [T, string][];
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-card p-0.5">
      {options.map(([k, l]) => (
        <button
          key={k}
          type="button"
          onClick={() => onChange(k)}
          className={cn(
            "min-h-9 rounded-md px-3 text-xs font-medium transition-colors",
            value === k
              ? "bg-primary text-primary-foreground"
              : "text-secondary-foreground hover:text-foreground",
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
