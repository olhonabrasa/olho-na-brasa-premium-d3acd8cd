import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, LogOut, RefreshCw } from "lucide-react";

import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import {
  fetchLeads,
  fetchOrders,
  fetchSessions,
  type Lead,
  type Order,
  type Session,
} from "./data";
import { Overview } from "./Overview";
import { Sessions } from "./Sessions";
import { Heatmap } from "./Heatmap";
import { Orders } from "./Orders";
import { Leads } from "./Leads";
import { Pricing } from "./Pricing";
import { Segmented } from "./ui";

type Tab = "visao" | "sessoes" | "mapa" | "pedidos" | "leads" | "precos";
type Period = "1" | "7" | "30" | "90";

const TABS: [Tab, string][] = [
  ["visao", "Visão geral"],
  ["sessoes", "Sessões"],
  ["mapa", "Mapa de cliques"],
  ["pedidos", "Pedidos"],
  ["leads", "Leads"],
  ["precos", "Preços e frete"],
];

function readPref<T extends string>(k: string, fallback: T): T {
  try {
    return (localStorage.getItem(k) as T) || fallback;
  } catch {
    return fallback;
  }
}

export function AdminApp() {
  const [auth, setAuth] = useState<"loading" | "out" | "denied" | "in">("loading");

  useEffect(() => {
    const check = async (hasSession: boolean) => {
      if (!hasSession) return setAuth("out");
      const { data, error } = await supabase.rpc("is_admin");
      // Antes da migração a função não existe: mantém o acesso de quem já logava.
      setAuth(error ? "in" : data ? "in" : "denied");
    };
    supabase.auth.getSession().then(({ data }) => void check(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => void check(Boolean(s)));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (auth === "loading")
    return (
      <main className="grid min-h-screen place-items-center bg-background text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" aria-label="Carregando" />
      </main>
    );
  if (auth === "out") return <Login />;
  if (auth === "denied")
    return (
      <main className="grid min-h-screen place-items-center bg-background px-4 text-center">
        <div>
          <p className="text-lg font-semibold text-foreground">
            Este usuário não tem acesso ao painel.
          </p>
          <button
            type="button"
            onClick={() => void supabase.auth.signOut()}
            className="mt-4 text-sm text-primary hover:underline"
          >
            Entrar com outra conta
          </button>
        </div>
      </main>
    );
  return <Dashboard />;
}

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          setBusy(false);
          if (error)
            setError(
              error.message === "Invalid login credentials"
                ? "E-mail ou senha incorretos."
                : error.message,
            );
        }}
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-6"
      >
        <h1 className="text-xl font-semibold text-foreground">Painel da LP Premium</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Acesso restrito à equipe Olho na Brasa.
        </p>
        <label className="mt-5 grid gap-1.5 text-sm text-foreground">
          E-mail
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field-base"
          />
        </label>
        <label className="mt-3 grid gap-1.5 text-sm text-foreground">
          Senha
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field-base"
          />
        </label>
        {error && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="press mt-5 h-12 w-full rounded-xl bg-primary font-semibold text-primary-foreground disabled:opacity-60"
        >
          {busy ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}

function Dashboard() {
  const [tab, setTabState] = useState<Tab>(() => readPref("onb_admin_tab", "visao"));
  const [period, setPeriodState] = useState<Period>(() => readPref("onb_admin_period", "7"));
  const [sessions, setSessions] = useState<Session[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openSession, setOpenSession] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const setTab = (t: Tab) => {
    setTabState(t);
    try {
      localStorage.setItem("onb_admin_tab", t);
    } catch {
      /* ignore */
    }
  };
  const setPeriod = (p: Period) => {
    setPeriodState(p);
    try {
      localStorage.setItem("onb_admin_period", p);
    } catch {
      /* ignore */
    }
  };

  const fromIso = useMemo(() => {
    const d = new Date();
    if (period === "1") d.setHours(0, 0, 0, 0);
    else d.setDate(d.getDate() - Number(period));
    return d.toISOString();
  }, [period]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const results = await Promise.allSettled([
      fetchSessions(fromIso),
      fetchLeads(fromIso),
      fetchOrders(),
    ]);
    const [s, l, o] = results;
    if (s.status === "fulfilled") setSessions(s.value);
    if (l.status === "fulfilled") setLeads(l.value);
    if (o.status === "fulfilled") setOrders(o.value);
    const failed = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
    if (failed.length)
      setError(
        `Parte dos dados não carregou (${failed.map((f) => f.reason?.message).join("; ")}). Confira se a migração do banco foi aplicada.`,
      );
    setUpdatedAt(new Date());
    setLoading(false);
  }, [fromIso]);

  useEffect(() => {
    void load();
  }, [load]);

  // atualiza sozinho a cada 60s enquanto a aba está visível
  useEffect(() => {
    const id = window.setInterval(
      () => document.visibilityState === "visible" && void load(),
      60_000,
    );
    return () => window.clearInterval(id);
  }, [load]);

  const live = sessions.filter(
    (s) => Date.now() - new Date(s.last_seen_at).getTime() < 2 * 60 * 1000 && !s.ended_at,
  ).length;

  const openSessionTab = (id: string | null) => {
    setOpenSession(id);
    if (id && tab !== "sessoes") setTab("sessoes");
  };

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-3 px-4 py-3 md:px-6">
          <h1 className="text-base font-semibold text-foreground">LP Premium</h1>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs",
              live ? "bg-success/15 text-success" : "bg-white/5 text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                live ? "bg-success" : "bg-muted-foreground",
              )}
            />
            {live} na página agora
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Segmented<Period>
              value={period}
              onChange={setPeriod}
              options={[
                ["1", "Hoje"],
                ["7", "7 dias"],
                ["30", "30 dias"],
                ["90", "90 dias"],
              ]}
            />
            <button
              type="button"
              onClick={() => void load()}
              aria-label="Atualizar"
              className="grid h-9 w-9 place-items-center rounded-lg border border-border text-foreground hover:border-border-strong"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => void supabase.auth.signOut()}
              aria-label="Sair"
              className="grid h-9 w-9 place-items-center rounded-lg border border-border text-foreground hover:border-border-strong"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
        <nav
          className="mx-auto flex max-w-[1500px] gap-1 overflow-x-auto px-4 md:px-6"
          aria-label="Seções do painel"
        >
          {TABS.map(([k, l]) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              aria-current={tab === k ? "page" : undefined}
              className={cn(
                "relative whitespace-nowrap px-3 py-2.5 text-sm transition-colors",
                tab === k
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-secondary-foreground",
              )}
            >
              {l}
              {k === "pedidos" && orders.some((o) => o.status === "pago") ? (
                <span className="ml-1.5 rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                  {orders.filter((o) => o.status === "pago").length}
                </span>
              ) : null}
              {tab === k && (
                <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary" />
              )}
            </button>
          ))}
        </nav>
      </header>

      <div className="mx-auto max-w-[1500px] px-4 py-5 md:px-6">
        {error && (
          <p className="mb-4 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-foreground">
            {error}
          </p>
        )}
        {loading && !updatedAt ? (
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="skeleton h-20 rounded-2xl" />
              ))}
            </div>
            <div className="skeleton h-80 rounded-2xl" />
          </div>
        ) : (
          <>
            {tab === "visao" && (
              <Overview sessions={sessions} leads={leads} orders={orders} fromIso={fromIso} />
            )}
            {tab === "sessoes" && (
              <Sessions
                sessions={sessions}
                leads={leads}
                orders={orders}
                openSessionId={openSession}
                onOpen={openSessionTab}
              />
            )}
            {tab === "mapa" && <Heatmap sessions={sessions} fromIso={fromIso} />}
            {tab === "pedidos" && (
              <Orders
                orders={orders}
                onChanged={() => void load()}
                onOpenSession={openSessionTab}
              />
            )}
            {tab === "leads" && (
              <Leads leads={leads} sessions={sessions} onOpenSession={openSessionTab} />
            )}
            {tab === "precos" && <Pricing />}
          </>
        )}
        {updatedAt && (
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Atualizado às {updatedAt.toLocaleTimeString("pt-BR")} · atualiza sozinho a cada minuto
          </p>
        )}
      </div>
    </main>
  );
}
