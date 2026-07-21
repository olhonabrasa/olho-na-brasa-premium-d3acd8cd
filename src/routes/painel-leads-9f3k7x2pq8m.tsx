import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/painel-leads-9f3k7x2pq8m")({
  ssr: false,
  component: PainelLeads,
  head: () => ({ meta: [{ title: "Painel de Leads" }, { name: "robots", content: "noindex, nofollow" }] }),
});

type Lead = {
  id: string;
  created_at: string;
  nome: string;
  whatsapp: string;
  email: string | null;
  cidade: string;
  estado: string;
  estagio: string | null;
  tipo_projeto: string | null;
  foto_url: string | null;
  origem_captura: string;
  clicked_whatsapp: boolean;
  clicked_whatsapp_at: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  page_url: string | null;
  user_agent: string | null;
};

function PainelLeads() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filter, setFilter] = useState<"all" | "chat_whatsapp" | "formulario" | "clicked">("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setAuthed(Boolean(session)));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!authed) return;
    void loadLeads();
  }, [authed]);

  const loadLeads = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) setError(error.message);
    else setLeads((data as Lead[]) || []);
    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError(error.message);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setLeads([]);
  };

  if (authed === null) {
    return <div className="min-h-screen bg-black p-6 text-white">Carregando...</div>;
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-black p-6 text-white flex items-center justify-center">
        <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4 rounded-xl border border-white/10 bg-white/5 p-6">
          <h1 className="text-xl font-bold">Painel de Leads</h1>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-md bg-black/40 px-3 py-2 outline-none"
          />
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Senha"
            className="w-full rounded-md bg-black/40 px-3 py-2 outline-none"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-orange-500 px-3 py-2 font-semibold text-black disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    );
  }

  const filtered = leads.filter((l) => {
    if (filter === "chat_whatsapp" && l.origem_captura !== "chat_whatsapp") return false;
    if (filter === "formulario" && l.origem_captura !== "formulario") return false;
    if (filter === "clicked" && !l.clicked_whatsapp) return false;
    if (search) {
      const q = search.toLowerCase();
      const hay = `${l.nome} ${l.whatsapp} ${l.cidade} ${l.estado} ${l.email ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const total = leads.length;
  const clicks = leads.filter((l) => l.clicked_whatsapp).length;
  const chatCount = leads.filter((l) => l.origem_captura === "chat_whatsapp").length;
  const formCount = leads.filter((l) => l.origem_captura === "formulario").length;

  const exportCsv = () => {
    const headers = [
      "created_at","nome","whatsapp","email","cidade","estado","estagio","tipo_projeto",
      "origem_captura","clicked_whatsapp","clicked_whatsapp_at","foto_url",
      "utm_source","utm_medium","utm_campaign","utm_content","page_url",
    ];
    const rows = filtered.map((l) =>
      headers.map((h) => {
        const v = (l as unknown as Record<string, unknown>)[h];
        return `"${String(v ?? "").replace(/"/g, '""')}"`;
      }).join(","),
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-black/90 px-4 py-3 backdrop-blur">
        <h1 className="text-lg font-bold">Painel de Leads</h1>
        <div className="flex gap-2">
          <button onClick={loadLeads} className="rounded-md bg-white/10 px-3 py-1.5 text-sm">Atualizar</button>
          <button onClick={exportCsv} className="rounded-md bg-orange-500 px-3 py-1.5 text-sm font-semibold text-black">Exportar CSV</button>
          <button onClick={handleLogout} className="rounded-md bg-white/10 px-3 py-1.5 text-sm">Sair</button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-4">
        <StatCard label="Total de leads" value={total} />
        <StatCard label="Clicaram no WhatsApp" value={clicks} />
        <StatCard label="Via chat" value={chatCount} />
        <StatCard label="Via formulário" value={formCount} />
      </div>

      <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
        {(["all", "formulario", "chat_whatsapp", "clicked"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs ${filter === f ? "bg-orange-500 text-black" : "bg-white/10"}`}
          >
            {f === "all" ? "Todos" : f === "formulario" ? "Formulário" : f === "chat_whatsapp" ? "Chat" : "Clicaram no WhatsApp"}
          </button>
        ))}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, WhatsApp, cidade..."
          className="ml-auto w-64 max-w-full rounded-md bg-white/10 px-3 py-1.5 text-sm outline-none"
        />
      </div>

      {loading ? (
        <div className="p-6 text-sm text-white/60">Carregando leads...</div>
      ) : filtered.length === 0 ? (
        <div className="p-6 text-sm text-white/60">Nenhum lead encontrado.</div>
      ) : (
        <div className="overflow-x-auto px-4 pb-8">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead className="text-left text-xs uppercase text-white/60">
              <tr className="border-b border-white/10">
                <th className="py-2 pr-3">Data</th>
                <th className="py-2 pr-3">Nome</th>
                <th className="py-2 pr-3">WhatsApp</th>
                <th className="py-2 pr-3">Cidade/UF</th>
                <th className="py-2 pr-3">Origem</th>
                <th className="py-2 pr-3">Estágio</th>
                <th className="py-2 pr-3">Tipo</th>
                <th className="py-2 pr-3">Clicou WA</th>
                <th className="py-2 pr-3">Foto</th>
                <th className="py-2 pr-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <Fragment key={l.id}>
                  <tr className="border-b border-white/5 align-top">
                    <td className="py-2 pr-3 text-xs text-white/70">
                      {new Date(l.created_at).toLocaleString("pt-BR")}
                    </td>
                    <td className="py-2 pr-3">{l.nome}</td>
                    <td className="py-2 pr-3">
                      <a href={`https://wa.me/55${l.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline">
                        {l.whatsapp}
                      </a>
                    </td>
                    <td className="py-2 pr-3">{l.cidade}/{l.estado}</td>
                    <td className="py-2 pr-3">
                      <span className={`rounded px-2 py-0.5 text-xs ${l.origem_captura === "chat_whatsapp" ? "bg-emerald-500/20 text-emerald-300" : "bg-blue-500/20 text-blue-300"}`}>
                        {l.origem_captura}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-xs text-white/80">{l.estagio || "—"}</td>
                    <td className="py-2 pr-3 text-xs text-white/80">{l.tipo_projeto || "—"}</td>
                    <td className="py-2 pr-3">
                      {l.clicked_whatsapp ? (
                        <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-300">SIM</span>
                      ) : (
                        <span className="rounded bg-white/10 px-2 py-0.5 text-xs text-white/50">não</span>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      {l.foto_url ? (
                        <a href={l.foto_url} target="_blank" rel="noreferrer">
                          <img src={l.foto_url} alt="" className="h-10 w-10 rounded object-cover" />
                        </a>
                      ) : "—"}
                    </td>
                    <td className="py-2 pr-3">
                      <button
                        onClick={() => setExpanded(expanded === l.id ? null : l.id)}
                        className="text-xs text-white/60 hover:text-white"
                      >
                        {expanded === l.id ? "▲" : "▼"}
                      </button>
                    </td>
                  </tr>
                  {expanded === l.id && (
                    <tr className="border-b border-white/10 bg-white/5">
                      <td colSpan={10} className="p-4 text-xs">
                        <div className="grid gap-2 md:grid-cols-2">
                          <Info label="Email" value={l.email} />
                          <Info label="Clicou WA em" value={l.clicked_whatsapp_at ? new Date(l.clicked_whatsapp_at).toLocaleString("pt-BR") : "—"} />
                          <Info label="UTM source" value={l.utm_source} />
                          <Info label="UTM medium" value={l.utm_medium} />
                          <Info label="UTM campaign" value={l.utm_campaign} />
                          <Info label="UTM content" value={l.utm_content} />
                          <Info label="Página" value={l.page_url} />
                          <Info label="User agent" value={l.user_agent} />
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
      <p className="text-xs text-white/60">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-white/50">{label}</p>
      <p className="break-all text-white/90">{value || "—"}</p>
    </div>
  );
}
