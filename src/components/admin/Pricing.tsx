import { useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabase";
import { loadStore } from "@/lib/store";
import { REGION_BY_UF, type CatalogItem, type PriceRow, type StoreSettings } from "@/lib/pricing";
import { Empty, Panel, Segmented } from "./ui";

const KIT_WIDTHS = Array.from({ length: 12 }, (_, i) => 45 + i * 5); // 45..100
const KIT_DEPTHS = Array.from({ length: 9 }, (_, i) => 35 + i * 5); // 35..75
const uniq = (a: number[]) => [...new Set(a)].sort((x, y) => x - y);

const key = (w: number, d: number) => `${w}x${d}`;
const toCents = (v: string) => {
  const n = Number(v.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
};
const fromCents = (c?: number) => (c ? (c / 100).toFixed(2).replace(".", ",") : "");

export function Pricing() {
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [prices, setPrices] = useState<PriceRow[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [item, setItem] = useState("kit_premium");
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [extraW, setExtraW] = useState<number[]>([]);
  const [extraD, setExtraD] = useState<number[]>([]);
  const [newW, setNewW] = useState("");
  const [newD, setNewD] = useState("");

  const load = async () => {
    const [c, p, s] = await Promise.all([
      supabase.from("catalog_items").select("*").order("sort"),
      supabase.from("price_table").select("item_id,width_cm,depth_cm,price_cents"),
      supabase.from("store_settings").select("*").eq("id", 1).single(),
    ]);
    if (c.error || p.error || s.error) {
      setErr((c.error ?? p.error ?? s.error)!.message);
      return;
    }
    setCatalog(c.data as CatalogItem[]);
    setPrices(p.data as PriceRow[]);
    setSettings(s.data as StoreSettings);
  };
  useEffect(() => {
    void load();
  }, []);

  const current = catalog.find((c) => c.id === item);
  const rowsOf = prices.filter((p) => p.item_id === item);
  const isKit = current?.size_kind === "boca";
  const widths = uniq([...(isKit ? KIT_WIDTHS : []), ...rowsOf.map((r) => r.width_cm), ...extraW]);
  const depths = current?.uses_depth
    ? uniq([...(isKit ? KIT_DEPTHS : []), ...rowsOf.map((r) => r.depth_cm), ...extraD])
    : [0];
  const saved = useMemo(() => {
    const m = new Map<string, number>();
    prices
      .filter((p) => p.item_id === item)
      .forEach((p) => m.set(key(p.width_cm, p.depth_cm), p.price_cents));
    return m;
  }, [prices, item]);

  useEffect(() => {
    setDraft({});
    setExtraW([]);
    setExtraD([]);
  }, [item]);

  const dirty = Object.keys(draft).length;

  const saveGrid = async () => {
    setSaving(true);
    setMsg(null);
    const upserts: PriceRow[] = [];
    const deletes: { w: number; d: number }[] = [];
    for (const [k, v] of Object.entries(draft)) {
      const [w, d] = k.split("x").map(Number);
      const cents = toCents(v);
      if (cents) upserts.push({ item_id: item, width_cm: w, depth_cm: d, price_cents: cents });
      else if (v.trim() === "") deletes.push({ w, d });
    }
    let error = null as null | { message: string };
    if (upserts.length)
      error = (
        await supabase
          .from("price_table")
          .upsert(upserts.map((u) => ({ ...u, updated_at: new Date().toISOString() })))
      ).error;
    for (const x of deletes) {
      if (error) break;
      error = (
        await supabase
          .from("price_table")
          .delete()
          .match({ item_id: item, width_cm: x.w, depth_cm: x.d })
      ).error;
    }
    setSaving(false);
    if (error) setMsg(error.message);
    else {
      setMsg(`${upserts.length + deletes.length} preços atualizados.`);
      setDraft({});
      await load();
      void loadStore(true);
    }
  };

  const saveSettings = async (patch: Partial<StoreSettings>) => {
    const { error } = await supabase
      .from("store_settings")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", 1);
    setMsg(error ? error.message : "Configurações salvas.");
    if (!error) await load();
  };

  if (err)
    return (
      <Empty>
        Não foi possível carregar a tabela de preços ({err}). Rode a migração do banco primeiro.
      </Empty>
    );
  if (!settings) return <div className="skeleton h-96 rounded-2xl" />;

  return (
    <div className="grid gap-4">
      <Panel
        title="Tabela de preços"
        action={
          <div className="flex items-center gap-3">
            {msg && <span className="text-xs text-secondary-foreground">{msg}</span>}
            <button
              type="button"
              disabled={!dirty || saving}
              onClick={() => void saveGrid()}
              className="h-9 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-40"
            >
              {saving ? "Salvando…" : dirty ? `Salvar ${dirty} alterações` : "Salvar"}
            </button>
          </div>
        }
      >
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <Segmented
            value={item}
            onChange={setItem}
            options={catalog.map((c) => [c.id, c.name] as [string, string])}
          />
        </div>
        <div className="mb-3 flex flex-wrap items-end gap-2 text-xs text-muted-foreground">
          <label className="grid gap-1">
            {current?.size_kind === "comp" ? "Novo comprimento (cm)" : "Nova largura (cm)"}
            <input
              value={newW}
              onChange={(e) => setNewW(e.target.value.replace(/\D/g, ""))}
              className="h-9 w-24 rounded-md border border-border bg-background px-2 text-sm text-foreground"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              const n = Number(newW);
              if (n >= 20 && n <= 300) setExtraW((x) => [...x, n]);
              setNewW("");
            }}
            className="h-9 rounded-md border border-border px-3 text-sm text-foreground hover:border-border-strong"
          >
            Adicionar linha
          </button>
          {current?.uses_depth && (
            <>
              <label className="ml-3 grid gap-1">
                Novo comprimento (cm)
                <input
                  value={newD}
                  onChange={(e) => setNewD(e.target.value.replace(/\D/g, ""))}
                  className="h-9 w-24 rounded-md border border-border bg-background px-2 text-sm text-foreground"
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  const n = Number(newD);
                  if (n >= 10 && n <= 300) setExtraD((x) => [...x, n]);
                  setNewD("");
                }}
                className="h-9 rounded-md border border-border px-3 text-sm text-foreground hover:border-border-strong"
              >
                Adicionar coluna
              </button>
            </>
          )}
        </div>
        <p className="mb-3 text-xs leading-5 text-muted-foreground">
          {isKit
            ? "Preço do kit por medida da boca. A medida do cliente arredonda para baixo até a faixa com preço (57 cm usa 55). Linhas: largura A. Colunas: comprimento B. Célula vazia = WhatsApp."
            : current?.uses_depth
              ? "Preço da peça avulsa por tamanho (largura × comprimento da peça). Célula vazia = tamanho não vendido."
              : "Preço da peça avulsa por tamanho. Vazio = tamanho não vendido."}
        </p>
        <div className="overflow-x-auto">
          <table className="border-separate border-spacing-1 text-sm">
            <thead>
              <tr>
                <th className="px-2 text-left text-xs font-medium text-muted-foreground">A \ B</th>
                {depths.map((d) => (
                  <th key={d} className="px-2 text-xs font-medium text-muted-foreground">
                    {d ? `${d} cm` : "preço"}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {widths.map((w) => (
                <tr key={w}>
                  <th className="pr-2 text-right text-xs font-medium text-muted-foreground tabular-nums">
                    {w} cm
                  </th>
                  {depths.map((d) => {
                    const k = key(w, d);
                    const has = saved.get(k);
                    const val = k in draft ? draft[k] : fromCents(has);
                    const changed = k in draft;
                    return (
                      <td key={d}>
                        <input
                          value={val}
                          inputMode="decimal"
                          aria-label={`Preço ${w} × ${d} cm`}
                          onChange={(e) =>
                            setDraft((cur) => ({
                              ...cur,
                              [k]: e.target.value.replace(/[^\d.,]/g, ""),
                            }))
                          }
                          className={`h-9 w-24 rounded-md border bg-background px-2 text-right text-sm tabular-nums text-foreground focus:border-primary focus:outline-none ${changed ? "border-primary" : has ? "border-border" : "border-dashed border-border/60"}`}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <SettingsForm settings={settings} onSave={saveSettings} />
    </div>
  );
}

function SettingsForm({
  settings,
  onSave,
}: {
  settings: StoreSettings;
  onSave: (p: Partial<StoreSettings>) => Promise<void>;
}) {
  const [pix, setPix] = useState(String(settings.pix_discount_pct));
  const [inst, setInst] = useState(String(settings.max_installments));
  const [days, setDays] = useState(String(settings.production_days));
  const [enabled, setEnabled] = useState(settings.checkout_enabled);
  const [free, setFree] = useState<string[]>(settings.free_shipping_ufs);
  const [ship, setShip] = useState<Record<string, string>>(
    Object.fromEntries(
      Object.entries(settings.shipping_cents_by_uf ?? {}).map(([k, v]) => [k, fromCents(v)]),
    ),
  );
  const ufs = Object.keys(REGION_BY_UF);

  const submit = () => {
    const shipping: Record<string, number> = {};
    for (const [uf, v] of Object.entries(ship)) {
      const c = v.trim() === "0" ? 0 : toCents(v);
      if (c != null) shipping[uf] = c;
    }
    void onSave({
      pix_discount_pct: Math.min(30, Math.max(0, Number(pix.replace(",", ".")) || 0)),
      max_installments: Math.min(12, Math.max(1, Math.round(Number(inst)) || 1)),
      production_days: Math.max(1, Math.round(Number(days)) || 10),
      checkout_enabled: enabled,
      free_shipping_ufs: free,
      shipping_cents_by_uf: shipping,
    });
  };

  return (
    <Panel
      title="Pagamento e frete"
      action={
        <button
          type="button"
          onClick={submit}
          className="h-9 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground"
        >
          Salvar configurações
        </button>
      }
    >
      <div className="grid gap-4 md:grid-cols-4">
        <label className="grid gap-1 text-xs text-muted-foreground">
          Desconto no Pix (%)
          <input
            value={pix}
            onChange={(e) => setPix(e.target.value)}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
          />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Parcelas sem juros (máx.)
          <input
            value={inst}
            onChange={(e) => setInst(e.target.value)}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
          />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Prazo de produção (dias úteis)
          <input
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
          />
        </label>
        <label className="flex items-center gap-2 self-end pb-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="h-4 w-4 accent-[var(--primary)]"
          />
          Pagamento online ligado
        </label>
      </div>
      <p className="mt-5 text-xs text-muted-foreground">
        Frete por estado. Marque os estados com frete grátis; nos demais, informe o valor (vazio =
        cliente fecha o frete no WhatsApp).
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {ufs.map((uf) => {
          const isFree = free.includes(uf);
          return (
            <div
              key={uf}
              className="flex items-center gap-2 rounded-lg border border-border px-2 py-1.5"
            >
              <label className="flex items-center gap-1.5 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={isFree}
                  onChange={(e) =>
                    setFree((f) => (e.target.checked ? [...f, uf] : f.filter((x) => x !== uf)))
                  }
                  className="accent-[var(--primary)]"
                />
                {uf}
              </label>
              {isFree ? (
                <span className="ml-auto text-xs text-success">grátis</span>
              ) : (
                <input
                  value={ship[uf] ?? ""}
                  onChange={(e) =>
                    setShip((s) => ({ ...s, [uf]: e.target.value.replace(/[^\d.,]/g, "") }))
                  }
                  placeholder="WhatsApp"
                  aria-label={`Frete para ${uf} em reais`}
                  className="ml-auto h-8 w-20 rounded-md border border-border bg-background px-2 text-right text-xs tabular-nums text-foreground placeholder:text-muted-foreground"
                />
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
