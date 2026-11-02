import { Fragment, useMemo, useState } from "react";
import { Search } from "lucide-react";

import { downloadCsv, fmtDate, waLink, type Lead, type Session } from "./data";
import { Empty, Pill, Segmented } from "./ui";

type Filter = "todos" | "formulario" | "chat_whatsapp" | "clicou";

export function Leads({
  leads,
  sessions,
  onOpenSession,
}: {
  leads: Lead[];
  sessions: Session[];
  onOpenSession: (id: string) => void;
}) {
  const [filter, setFilter] = useState<Filter>("todos");
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const sessionFor = useMemo(() => {
    const byId = new Map(sessions.map((s) => [s.id, s]));
    const byLead = new Map<string, Session>();
    sessions.forEach((s) => s.lead_id && !byLead.has(s.lead_id) && byLead.set(s.lead_id, s));
    return (l: Lead) => (l.session_id ? byId.get(l.session_id) : undefined) ?? byLead.get(l.id);
  }, [sessions]);

  const list = leads.filter((l) => {
    if (filter === "clicou" && !l.clicked_whatsapp) return false;
    if ((filter === "formulario" || filter === "chat_whatsapp") && l.origem_captura !== filter)
      return false;
    if (q) {
      const hay = [l.nome, l.whatsapp, l.email, l.cidade, l.estado, l.utm_campaign]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            ["todos", `Todos (${leads.length})`],
            ["formulario", "Formulário"],
            ["chat_whatsapp", "Chat"],
            ["clicou", "Clicaram no WhatsApp"],
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
            placeholder="Nome, WhatsApp, cidade…"
            aria-label="Buscar leads"
            className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </label>
        <button
          type="button"
          onClick={() =>
            downloadCsv(
              `leads-${new Date().toISOString().slice(0, 10)}.csv`,
              list as unknown as Record<string, unknown>[],
            )
          }
          className="h-10 rounded-lg border border-border bg-card px-3 text-sm text-foreground hover:border-border-strong"
        >
          Exportar CSV
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr className="border-b border-border">
              {[
                "Data",
                "Nome",
                "WhatsApp",
                "Cidade/UF",
                "Origem",
                "Projeto",
                "WhatsApp?",
                "Campanha",
                "",
              ].map((h) => (
                <th key={h} className="px-3 py-2.5 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map((l) => {
              const s = sessionFor(l);
              return (
                <Fragment key={l.id}>
                  <tr className="border-b border-border/50 align-top">
                    <td className="whitespace-nowrap px-3 py-2.5 text-secondary-foreground tabular-nums">
                      {fmtDate(l.created_at)}
                    </td>
                    <td className="px-3 py-2.5 text-foreground">
                      {l.nome || <span className="text-muted-foreground">Incompleto</span>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      {l.whatsapp ? (
                        <a
                          href={waLink(l.whatsapp)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-success hover:underline"
                        >
                          {l.whatsapp}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-secondary-foreground">
                      {[l.cidade, l.estado].filter(Boolean).join("/") || "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <Pill tone={l.origem_captura === "chat_whatsapp" ? "ok" : "info"}>
                        {l.origem_captura === "chat_whatsapp" ? "Chat" : "Formulário"}
                      </Pill>
                    </td>
                    <td className="max-w-[200px] px-3 py-2.5 text-xs text-secondary-foreground">
                      {l.tipo_projeto || "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      {l.clicked_whatsapp ? <Pill tone="ok">Sim</Pill> : <Pill>não</Pill>}
                    </td>
                    <td className="max-w-[180px] truncate px-3 py-2.5 text-xs text-secondary-foreground">
                      {l.utm_campaign || "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right">
                      {s && (
                        <button
                          type="button"
                          onClick={() => onOpenSession(s.id)}
                          className="mr-3 text-xs text-primary hover:underline"
                        >
                          Navegação
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setExpanded(expanded === l.id ? null : l.id)}
                        className="text-xs text-secondary-foreground hover:text-foreground"
                        aria-expanded={expanded === l.id}
                      >
                        {expanded === l.id ? "Fechar" : "Detalhes"}
                      </button>
                    </td>
                  </tr>
                  {expanded === l.id && (
                    <tr className="border-b border-border bg-white/[0.02]">
                      <td colSpan={9} className="px-4 py-3 text-xs">
                        <div className="grid gap-2 md:grid-cols-3">
                          {[
                            ["E-mail", l.email],
                            ["CEP", l.cep],
                            ["Estágio", l.estagio],
                            [
                              "Clicou WA em",
                              l.clicked_whatsapp_at ? fmtDate(l.clicked_whatsapp_at) : null,
                            ],
                            ["UTM source", l.utm_source],
                            ["UTM medium", l.utm_medium],
                            ["UTM content", l.utm_content],
                            ["Página", l.page_url],
                            ["Navegador", l.user_agent],
                          ].map(([k, v]) => (
                            <div key={k}>
                              <p className="text-muted-foreground">{k}</p>
                              <p className="break-all text-foreground">{v || "—"}</p>
                            </div>
                          ))}
                          {l.foto_url && (
                            <a href={l.foto_url} target="_blank" rel="noopener noreferrer">
                              <img
                                src={l.foto_url}
                                alt="Foto da churrasqueira enviada pelo lead"
                                className="h-24 rounded-lg object-cover"
                              />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
        {!list.length && <Empty>Nenhum lead encontrado.</Empty>}
      </div>
    </div>
  );
}
