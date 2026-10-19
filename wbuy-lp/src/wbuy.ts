// Ponte com a loja Wbuy. A página roda dentro de olhonabrasa.com.br/m/<slug>/,
// então as chamadas são as mesmas do tema (mesma origem, mesmos cookies):
//  - preço ao vivo: load-widget.php (widget da página de produto)
//  - carrinho: shop_func.php funcao=adicionar_produto, depois /carrinho/
// Fora da loja (desenvolvimento local) tudo cai num modo simulado.

export type Preco = {
  valor: number;
  pix: number | null;
  parcelas: string | null;
  prazo: string | null;
};

// loja final e a prévia da Wbuy (olhonabrasa.lojawbuy.com.br): mesma plataforma, mesmo carrinho
const NA_LOJA = /(^|\.)olhonabrasa\.(com\.br|lojawbuy\.com\.br)$/.test(location.hostname);
export const MODO_SIMULADO = !NA_LOJA;

type JQ = {
  post: (
    url: string,
    data: unknown,
    cb: (r: unknown) => void,
    type?: string,
  ) => { fail: (f: () => void) => void };
};
const jq = () => (window as unknown as { jQuery?: JQ }).jQuery;

function post(url: string, data: Record<string, string | number>, json: boolean): Promise<unknown> {
  const $ = jq();
  if ($)
    return new Promise((res, rej) => {
      $.post(url, data, res, json ? "json" : "html").fail(() => rej(new Error("rede")));
    });
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(data)) body.append(k, String(v));
  return fetch("/" + url, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "X-Requested-With": "XMLHttpRequest",
    },
    body,
  }).then((r) => {
    if (!r.ok) throw new Error("HTTP " + r.status);
    return json ? r.json() : r.text();
  });
}

const num = (s: string) => parseFloat(s.replace(/\./g, "").replace(",", "."));

export function lerPrecoDoWidget(html: string): Preco | null {
  const v = html.match(/produto_valor\s*=\s*parseFloat\('([\d.]+)'\)/);
  if (!v) return null;
  const pix = html.match(/R\$\s*([\d.,]+)\s*<\/strong>\s*com\s*PIX/i);
  const parc = html.match(
    /<strong>(\d+x)<\/strong>\s*de\s*<strong>R\$\s*([\d.,]+)<\/strong>\s*sem juros/i,
  );
  const prazo = html.match(/Prazo de produ[^:<]*:\s*([^<]+)</i);
  return {
    valor: parseFloat(v[1]),
    pix: pix ? num(pix[1]) : null,
    parcelas: parc ? `${parc[1]} de R$ ${parc[2]} sem juros` : null,
    prazo: prazo ? prazo[1].trim() : null,
  };
}

// --- preço ao vivo, com cache e fila (a loja limita rajadas de requisição) ---
const cache = new Map<string, Promise<Preco | null>>();
let fila: Promise<unknown> = Promise.resolve();
const CHAVE = "onb-lp-precos-v1";
const salvo: Record<string, Preco> = (() => {
  try {
    return JSON.parse(sessionStorage.getItem(CHAVE) || "{}");
  } catch {
    return {};
  }
})();

export function preco(sku: string): Promise<Preco | null> {
  if (salvo[sku]) return Promise.resolve(salvo[sku]);
  const c = cache.get(sku);
  if (c) return c;
  const p = (fila = fila.then(
    async () => {
      if (MODO_SIMULADO) return precoSimulado(sku);
      const html = (await post(
        "load-widget.php",
        { widget: "widgets/produto-sku.html", sku },
        false,
      )) as string;
      await new Promise((r) => setTimeout(r, 250));
      return lerPrecoDoWidget(html);
    },
    () => null,
  )).then((r) => {
    const preco = r as Preco | null;
    if (preco) {
      salvo[sku] = preco;
      try {
        sessionStorage.setItem(CHAVE, JSON.stringify(salvo));
      } catch {
        /* navegação privada */
      }
    } else cache.delete(sku);
    return preco;
  }) as Promise<Preco | null>;
  cache.set(sku, p);
  return p;
}

export type ItemCarrinho = { sku: string; qtd: number; anotacao?: string };

/** Adiciona um a um (mesma chamada do botão Comprar do tema) e devolve o total de itens. */
export async function adicionarAoCarrinho(itens: ItemCarrinho[]): Promise<number> {
  let total = 0;
  for (const it of itens) {
    if (MODO_SIMULADO) {
      console.info("[simulado] adicionar_produto", it);
      total += it.qtd;
      await new Promise((r) => setTimeout(r, 200));
      continue;
    }
    const r = (await post(
      "shop_func.php",
      {
        funcao: "adicionar_produto",
        sku: it.sku,
        quantidade: it.qtd,
        campo_anotacao: it.anotacao ?? "",
      },
      true,
    )) as { code?: string | number; message?: string; itens?: { total_items?: number } };
    const code = String(r?.code ?? "");
    if (code !== "010") {
      const msg =
        code === "037" ? "Este item pede uma informação extra na página do produto." : r?.message;
      throw new Error(limparHtml(msg || "Não foi possível adicionar ao carrinho."));
    }
    total = r.itens?.total_items ?? total + it.qtd;
  }
  return total;
}

export function irParaCarrinho() {
  if (MODO_SIMULADO) {
    alert("Modo simulado: na loja, aqui vai para /carrinho/ (frete e pagamento da Wbuy).");
    return;
  }
  location.href = "/carrinho/";
}

function limparHtml(s: string) {
  const d = document.createElement("div");
  d.innerHTML = s;
  return (d.textContent || "").trim();
}

// --- valores de exemplo só para desenvolvimento local ---
function precoSimulado(sku: string): Preco {
  const base: Record<string, number> = {
    "5250835": 3200,
    "5046861": 690,
    "5047524": 330,
    "5046898": 260,
    "4894682": 120,
    "4896947": 140,
  };
  const [prod, , a, b] = sku.split(".");
  const ajuste = ((Number(a) + Number(b || 0)) % 97) * 9;
  const valor = (base[prod] ?? 300) + ajuste;
  return {
    valor,
    pix: Math.round(valor * 0.95 * 100) / 100,
    parcelas: `10x de R$ ${(valor / 10).toFixed(2).replace(".", ",")} sem juros`,
    prazo: "Até 10 dias úteis",
  };
}
