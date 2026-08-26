import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Painel de Leads | Olho na Brasa" },
      { name: "description", content: "Área interna para acompanhamento dos leads captados pela landing page Olho na Brasa." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Painel de Leads | Olho na Brasa" },
      { property: "og:description", content: "Área interna para acompanhamento dos leads captados pela landing page Olho na Brasa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

type Lead = {
  id: string;
  created_at: string | null;
  nome: string | null;
  whatsapp: string | null;
  email: string | null;
  cidade: string | null;
  estado: string | null;
  estagio: string | null;
  tipo_projeto: string | null;
  foto_url: string | null;
  origem_captura: string | null;
  clicked_whatsapp: boolean | null;
  clicked_whatsapp_at: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  page_url: string | null;
  user_agent: string | null;
  [key: string]: unknown;
};

type Filtro = "todos" | "formulario" | "chat_whatsapp" | "clicou";

const onlyDigits = (v: string) => v.replace(/\D/g, "");

const formatDate = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(Boolean(session));
      if (!session) setLeads([]);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) setLoadError(error.message);
    else setLeads((data as Lead[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authed) void fetchLeads();
  }, [authed, fetchLeads]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSigningIn(true);
    setAuthError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setAuthError(error.message);
    setSigningIn(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setLeads([]);
    setAuthed(false);
  };

  const filtered = useMemo(() => {
    if (filtro === "todos") return leads;
    if (filtro === "clicou") return leads.filter((l) => l.clicked_whatsapp === true);
    return leads.filter((l) => l.origem_captura === filtro);
  }, [leads, filtro]);

  const kpis = useMemo(() => {
    const total = leads.length;
    const form = leads.filter((l) => l.origem_captura === "formulario").length;
    const chat = leads.filter((l) => l.origem_captura === "chat_whatsapp").length;
    const clicked = leads.filter((l) => l.clicked_whatsapp === true).length;
    const pct = total > 0 ? Math.round((clicked / total) * 100) : 0;
    return { total, form, chat, clicked, pct };
  }, [leads]);

  const exportCsv = () => {
    if (filtered.length === 0) return;
    const cols = Array.from(
      filtered.reduce<Set<string>>((acc, row) => {
        Object.keys(row).forEach((k) => acc.add(k));
        return acc;
      }, new Set<string>()),
    );
    const escape = (v: unknown) => {
      const s = v === null || v === undefined ? "" : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };
    const csv = [
      cols.join(","),
      ...filtered.map((row) => cols.map((c) => escape(row[c])).join(",")),
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (authed === null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Carregando...
      </main>
    );
  }

  if (!authed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <form
          onSubmit={handleSignIn}
          className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card p-6 shadow-lg"
        >
          <div>
            <h1 className="text-xl font-semibold text-foreground">Painel de Leads</h1>
            <p className="mt-1 text-sm text-muted-foreground">Acesso restrito à equipe.</p>
          </div>
          <div className="space-y-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-mail"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
            />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Senha"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>
          {authError ? <p className="text-sm text-red-400">{authError}</p> : null}
          <button
            type="submit"
            disabled={signingIn}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {signingIn ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-foreground md:text-2xl">Painel de Leads</h1>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void fetchLeads()}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground hover:bg-card-hover"
            >
              {loading ? "Atualizando..." : "Atualizar"}
            </button>
            <button
              type="button"
              onClick={exportCsv}
              className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
            >
              Exportar CSV
            </button>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground hover:bg-card-hover"
            >
              Sair
            </button>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard label="Total de leads" value={String(kpis.total)} />
          <KpiCard label="Via formulário" value={String(kpis.form)} />
          <KpiCard label="Via chat WhatsApp" value={String(kpis.chat)} />
          <KpiCard label="Clicaram no WhatsApp" value={`${kpis.pct}%`} hint={`${kpis.clicked} leads`} />
        </section>

        <div className="flex flex-wrap gap-2">
          {(
            [
              ["todos", "Todos"],
              ["formulario", "Formulário"],
              ["chat_whatsapp", "Chat WhatsApp"],
              ["clicou", "Clicaram no WhatsApp"],
            ] as [Filtro, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFiltro(key)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                filtro === key
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-card text-muted-foreground hover:bg-card-hover"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loadError ? <p className="text-sm text-red-400">{loadError}</p> : null}

        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                {["Data", "Nome", "WhatsApp", "Cidade/UF", "Origem", "Clicou WA", "Projeto", "Campanha", "Foto"].map(
                  (h) => (
                    <th key={h} className="whitespace-nowrap px-3 py-3 font-medium">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead) => (
                <tr
                  key={lead.id}
                  className={`border-b border-border/60 last:border-0 ${
                    lead.clicked_whatsapp ? "bg-primary/5" : ""
                  }`}
                >
                  <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">
                    {formatDate(lead.created_at)}
                  </td>
                  <td className="px-3 py-3 text-foreground">{lead.nome || "—"}</td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {lead.whatsapp ? (
                      <a
                        href={`https://wa.me/${onlyDigits(lead.whatsapp)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline"
                      >
                        {lead.whatsapp}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">
                    {[lead.cidade, lead.estado].filter(Boolean).join("/") || "—"}
                  </td>
                  <td className="px-3 py-3">
                    <span className="rounded-full border border-border px-2 py-0.5 text-xs text-foreground">
                      {lead.origem_captura === "chat_whatsapp"
                        ? "Chat"
                        : lead.origem_captura === "formulario"
                          ? "Formulário"
                          : "—"}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center text-foreground">
                    {lead.clicked_whatsapp ? "✓" : "—"}
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{lead.tipo_projeto || "—"}</td>
                  <td className="px-3 py-3 text-muted-foreground">{lead.utm_campaign || "—"}</td>
                  <td className="px-3 py-3">
                    {lead.foto_url ? (
                      <a
                        href={lead.foto_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline"
                      >
                        ver foto
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">
                    {loading ? "Carregando leads..." : "Nenhum lead encontrado."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

function KpiCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
