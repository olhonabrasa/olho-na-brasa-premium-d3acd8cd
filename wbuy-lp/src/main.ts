// LP de campanha "Monte seu kit" para rodar dentro de uma página de conteúdo
// da Wbuy (olhonabrasa.com.br/m/<slug>/). Procura <div id="onb-kit-lp"> e
// desenha tudo ali dentro. O 3D só baixa quando o montador chega perto da tela.
import css from "./styles.css?inline";
import {
  A_MAX,
  A_MIN,
  B_MAX,
  B_MIN,
  ancoras,
  capacidade,
  composicaoKit,
  composicaoMontagem,
  conteudoKit,
  faixaKit,
  grupoDaParte,
  montagemSugerida,
  normalizar,
  pecasDaMontagem,
  skuKit,
  type Grupo,
  type Montagem,
} from "./builder";
import { MEDIDAS } from "./catalog";
import type { Composicao } from "@/lib/kitComposition";
import { adicionarAoCarrinho, irParaCarrinho, MODO_SIMULADO, preco, type Preco } from "./wbuy";
import type { BuilderStage } from "./builderStage";
import { desenhoFrente } from "./fallback";

const ASSET_BASE: string = import.meta.env.DEV ? "/" : "https://premium.olhonabrasa.com.br/";
const WHATS = "https://wa.me/554740420956";

type Modo = "kit" | "pecas";
type Estado = { a: number; b: number; modo: Modo; m: Montagem; foco: Grupo | null };

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

const INFO: Record<Grupo, { titulo: string; sub: string }> = {
  suporte: {
    titulo: "Suporte suspenso",
    sub: "Estrutura de 3 níveis que fixa na parede da churrasqueira. É onde tudo encaixa.",
  },
  uruguaia: {
    titulo: "Grelha uruguaia",
    sub: "A grelha principal. Varões em V que escorrem a gordura, cabo que não esquenta.",
  },
  descanso: {
    titulo: "Grelha de descanso",
    sub: "No nível de cima, mantém a carne pronta aquecida sem passar do ponto.",
  },
  espeto: {
    titulo: "Espetos",
    sub: "Barra chata para cortes grandes; V para linguiça e coração não girarem.",
  },
};

function iniciar(root: HTMLElement) {
  const params = new URLSearchParams(location.search);
  const a0 = Number(params.get("a")) || 70;
  const b0 = Number(params.get("b")) || 60;
  const s: Estado = {
    a: a0,
    b: b0,
    modo: params.get("modo") === "pecas" ? "pecas" : "kit",
    m: montagemSugerida(a0, b0),
    foco: null,
  };
  if (!faixaKit(s.a, s.b)) s.modo = "pecas";

  root.innerHTML = esqueleto(s);
  root.classList.add("onb-pronto");
  const $ = <T extends Element = HTMLElement>(sel: string) => root.querySelector(sel) as T;

  const stageEl = $(".onb-stage");
  const canvas = $<HTMLCanvasElement>(".onb-stage canvas");
  const hotspots = $(".onb-hotspots");
  const pop = $(".onb-pop");
  const conteudo = $("#onb-conteudo");
  let stage: BuilderStage | null = null;
  let compAtual: Composicao | null = null;

  // ---------- 3D ----------
  const temWebGL = (() => {
    try {
      const c = document.createElement("canvas");
      return !!(c.getContext("webgl2") || c.getContext("webgl"));
    } catch {
      return false;
    }
  })();
  const mobile = matchMedia("(max-width: 899px), (pointer: coarse)").matches;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!temWebGL) stageEl.classList.add("sem-3d");
  else {
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !stage && !stageEl.dataset.carregando) carregar3D();
        stage?.setActive(e.isIntersecting);
      },
      { rootMargin: "200px 0px" },
    );
    io.observe(stageEl);
  }

  function carregar3D() {
    stageEl.dataset.carregando = "1";
    import("./builderStage")
      .then(({ createBuilderStage }) => {
        stage = createBuilderStage(stageEl, canvas, {
          mobile,
          reducedMotion: reduced,
          assetBase: ASSET_BASE,
          onProgress: (p) => stageEl.style.setProperty("--onb-progresso", String(p)),
          onPick: escolherNo3D,
          onRender: posicionarHotspots,
        });
        canvas.style.touchAction = "pan-y";
        stageEl.classList.add("com-3d");
        desenhar();
        stage.setActive(true);
        if (params.has("fps"))
          setInterval(() => ($(".onb-fps").textContent = JSON.stringify(stage!.stats())), 1000);
      })
      .catch((err) => {
        console.error(err);
        stageEl.classList.add("sem-3d");
        desenhar();
      });
  }

  function escolherNo3D(parte: string | null, x: number, y: number) {
    const g = parte ? grupoDaParte(parte) : null;
    s.foco = g;
    stage?.highlight(g ? parte : null);
    if (!g) return fecharPop();
    abrirPop(g, x, y);
    marcarCartao(g);
  }

  function abrirPop(g: Grupo, x: number, y: number) {
    const fantasma = g === "suporte" && !s.m.suporte.on;
    let corpo = `<strong>${INFO[g].titulo}</strong><span>${esc(rotuloGrupo(g))}</span>`;
    if (s.modo === "pecas") {
      corpo += fantasma
        ? `<button type="button" data-pop="incluir">Incluir suporte</button>`
        : `<button type="button" data-pop="editar">Trocar medida</button>` +
          (g === "suporte"
            ? `<button type="button" data-pop="remover">Já tenho suporte</button>`
            : `<button type="button" data-pop="remover">Remover 1</button>`);
    } else corpo += `<button type="button" data-pop="personalizar">Trocar esta peça</button>`;
    pop.innerHTML = corpo;
    pop.dataset.grupo = g;
    const w = stageEl.clientWidth;
    pop.style.left = Math.min(Math.max(x, 110), w - 110) + "px";
    pop.style.top = Math.max(y - 12, 70) + "px";
    pop.hidden = false;
  }
  function fecharPop() {
    pop.hidden = true;
    s.foco = null;
    stage?.highlight(null);
  }

  pop.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-pop]");
    if (!b) return;
    const g = pop.dataset.grupo as Grupo;
    const acao = b.dataset.pop;
    if (acao === "personalizar") {
      definirModo("pecas");
      requestAnimationFrame(() => irParaCartao(g));
    } else if (acao === "editar") irParaCartao(g);
    else if (acao === "incluir") alterar(g, +1);
    else if (acao === "remover") alterar(g, -1);
    fecharPop();
  });

  function rotuloGrupo(g: Grupo) {
    if (s.modo === "kit" && compAtual) {
      const c = compAtual;
      if (g === "suporte") return `${c.suporteLarguraCm} cm · 3 níveis`;
      if (g === "uruguaia")
        return `${c.uruguaia.quantidade}× ${c.uruguaia.larguraCm}×${c.uruguaia.comprimentoCm} cm`;
      if (g === "descanso")
        return c.descanso ? `${c.descanso.quantidade}× ${c.descanso.larguraCm} cm` : "";
      return `${c.espetos.quantidade}× duplo ${c.espetos.comprimentoCm} cm`;
    }
    const m = s.m;
    if (g === "suporte")
      return m.suporte.on ? `${m.suporte.larguraCm} cm · 3 níveis` : "Ainda não incluído";
    if (g === "uruguaia")
      return `${m.uruguaia.qtd}× ${m.uruguaia.larguraCm}×${m.uruguaia.comprimentoCm} cm`;
    if (g === "descanso") return `${m.descanso.qtd}× ${m.descanso.larguraCm} cm`;
    return `${m.espeto.qtd}× ${m.espeto.tipo === "espeto_v" ? "V" : "barra chata"} ${m.espeto.comprimentoCm} cm`;
  }

  // pontos de "+" sobre o canvas
  let ancorasAtuais: ReturnType<typeof ancoras> = [];
  function montarHotspots() {
    ancorasAtuais = s.modo === "pecas" && stage ? ancoras(s.m) : [];
    hotspots.innerHTML = ancorasAtuais
      .map(
        (a, i) =>
          `<button type="button" class="onb-hot" data-i="${i}" data-grupo="${a.grupo}" aria-label="Adicionar ${a.rotulo.toLowerCase()}"><span aria-hidden="true">+</span><em>${a.rotulo}</em></button>`,
      )
      .join("");
    posicionarHotspots();
  }
  function posicionarHotspots() {
    if (!stage) return;
    const els = hotspots.children;
    const usados: { x: number; y: number }[] = [];
    ancorasAtuais.forEach((a, i) => {
      const el = els[i] as HTMLElement | undefined;
      if (!el) return;
      const p = stage!.project(a.pos);
      // dois pontos no mesmo lugar: empurra o de baixo para não cobrir o outro
      while (usados.some((u) => Math.abs(u.x - p.x) < 120 && Math.abs(u.y - p.y) < 42)) p.y += 44;
      usados.push({ x: p.x, y: p.y });
      el.style.transform = `translate(${p.x}px, ${p.y}px)`;
      el.hidden = p.atras;
    });
  }
  hotspots.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>(".onb-hot");
    if (b) alterar(b.dataset.grupo as Grupo, +1);
  });

  // ---------- estado -> tela ----------
  function desenhar() {
    compAtual = s.modo === "kit" ? composicaoKit(s.a, s.b) : composicaoMontagem(s.m, s.b);
    if (compAtual) {
      const fantasma = s.modo === "pecas" && !s.m.suporte.on ? ["suporte"] : [];
      stage?.update(compAtual, { fantasma });
      $(".onb-fallback").innerHTML = desenhoFrente(compAtual, fantasma.length > 0);
      canvas.setAttribute("aria-label", descreverParaLeitor());
    }
    montarHotspots();
    renderConteudo();
    atualizarPreco();
  }

  function descreverParaLeitor() {
    const itens =
      s.modo === "kit" && compAtual
        ? conteudoKit(compAtual)
        : pecasDaMontagem(s.m).map((i) => `${i.peca.qtd}× ${i.rotulo}`);
    return `Kit em 3D para churrasqueira de ${s.a} por ${s.b} cm: ${itens.join(", ")}.`;
  }

  function renderConteudo() {
    const f = faixaKit(s.a, s.b);
    root.querySelectorAll<HTMLButtonElement>("[data-modo]").forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset.modo === s.modo));
      if (b.dataset.modo === "kit") b.disabled = !f;
    });
    $(".onb-faixa").innerHTML = f
      ? `Kit da faixa <strong>${f.a}×${f.b} cm</strong> — serve na sua boca de ${s.a}×${s.b} cm.`
      : `Sua medida está fora das faixas do Kit Premium (50–99 × 40–74 cm). Monte peça por peça abaixo ou <a href="${WHATS}" target="_blank" rel="noopener">fale com a fábrica</a>.`;

    if (s.modo === "kit") {
      const c = compAtual;
      conteudo.innerHTML = c
        ? `<ul class="onb-lista">${conteudoKit(c)
            .map((l) => `<li>${l}</li>`)
            .join("")}</ul>
          <button type="button" class="onb-link" data-modo-ir="pecas">Quer trocar ou tirar alguma peça? Monte peça por peça →</button>`
        : "";
      return;
    }
    const m = s.m;
    const cap = capacidade(m);
    const opt = (lista: number[], v: number) =>
      lista
        .map((x) => `<option value="${x}"${x === v ? " selected" : ""}>${x} cm</option>`)
        .join("");
    const stepper = (g: Grupo, q: number, max: number) =>
      `<div class="onb-stepper" role="group" aria-label="Quantidade">
        <button type="button" data-acao="menos" data-grupo="${g}" aria-label="Menos" ${q <= 0 ? "disabled" : ""}>−</button>
        <output aria-live="polite">${q}</output>
        <button type="button" data-acao="mais" data-grupo="${g}" aria-label="Mais" ${q >= max ? "disabled" : ""}>+</button>
      </div>`;
    const cartao = (g: Grupo, corpo: string, ativo: boolean) =>
      `<article class="onb-card${ativo ? "" : " vazio"}${s.foco === g ? " foco" : ""}" data-cartao="${g}" tabindex="-1">
        <header><h3>${INFO[g].titulo}</h3><p class="onb-preco-peca" data-preco-grupo="${g}"></p></header>
        <p class="onb-sub">${INFO[g].sub}</p>${corpo}</article>`;

    conteudo.innerHTML = [
      cartao(
        "suporte",
        `<div class="onb-row">
          <label>Largura <select data-campo="suporte.larguraCm">${opt(MEDIDAS.suporte, m.suporte.larguraCm)}</select></label>
          <label class="onb-switch"><input type="checkbox" data-campo="suporte.on" ${m.suporte.on ? "checked" : ""}> Incluir</label>
        </div>`,
        m.suporte.on,
      ),
      cartao(
        "uruguaia",
        `<div class="onb-row">
          <label>Medida <span class="onb-par"><select data-campo="uruguaia.larguraCm" aria-label="Largura">${opt(MEDIDAS.uruguaiaLargura, m.uruguaia.larguraCm)}</select>×<select data-campo="uruguaia.comprimentoCm" aria-label="Comprimento">${opt(MEDIDAS.uruguaiaComprimento, m.uruguaia.comprimentoCm)}</select></span></label>
          ${stepper("uruguaia", m.uruguaia.qtd, cap.uruguaia)}
        </div><p class="onb-cap">Cabem até ${cap.uruguaia} neste suporte.</p>`,
        m.uruguaia.qtd > 0,
      ),
      cartao(
        "descanso",
        `<div class="onb-row">
          <label>Largura <select data-campo="descanso.larguraCm">${opt(MEDIDAS.descanso, m.descanso.larguraCm)}</select></label>
          ${stepper("descanso", m.descanso.qtd, cap.descanso)}
        </div>${cap.descanso === 0 ? `<p class="onb-cap">O nível de cima está ocupado por grelhas.</p>` : ""}`,
        m.descanso.qtd > 0,
      ),
      cartao(
        "espeto",
        `<div class="onb-seg" role="group" aria-label="Tipo de espeto">
          <button type="button" data-campo-set="espeto.tipo" data-valor="espeto_chata" aria-pressed="${m.espeto.tipo === "espeto_chata"}">Barra chata</button>
          <button type="button" data-campo-set="espeto.tipo" data-valor="espeto_v" aria-pressed="${m.espeto.tipo === "espeto_v"}">V</button>
        </div>
        <div class="onb-row">
          <label>Comprimento <select data-campo="espeto.comprimentoCm">${opt(MEDIDAS.espeto, m.espeto.comprimentoCm)}</select></label>
          ${stepper("espeto", m.espeto.qtd, cap.espeto)}
        </div>`,
        m.espeto.qtd > 0,
      ),
      `<button type="button" class="onb-link" data-sugerir>Voltar às peças sugeridas para ${s.a}×${s.b} cm</button>`,
    ].join("");
  }

  function marcarCartao(g: Grupo | null) {
    root
      .querySelectorAll(".onb-card")
      .forEach((c) => c.classList.toggle("foco", (c as HTMLElement).dataset.cartao === g));
  }
  function irParaCartao(g: Grupo) {
    const c = root.querySelector<HTMLElement>(`[data-cartao="${g}"]`);
    if (!c) return;
    marcarCartao(g);
    c.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
    c.focus({ preventScroll: true });
    c.querySelector("select")?.focus({ preventScroll: true });
  }

  function alterar(g: Grupo, d: number) {
    if (s.modo !== "pecas") definirModo("pecas");
    const m = s.m;
    if (g === "suporte") m.suporte.on = d > 0;
    else m[g].qtd = Math.max(0, m[g].qtd + d);
    s.m = normalizar(m);
    s.foco = g;
    desenhar();
    marcarCartao(g);
  }

  function definirModo(modo: Modo) {
    if (modo === "kit" && !faixaKit(s.a, s.b)) return;
    s.modo = modo;
    fecharPop();
    desenhar();
  }

  // ---------- preço ----------
  let geracao = 0;
  async function atualizarPreco() {
    const g = ++geracao;
    const itens =
      s.modo === "kit"
        ? (() => {
            const f = faixaKit(s.a, s.b);
            const sku = f && skuKit(f.a, f.b);
            return sku ? [{ sku, qtd: 1, grupo: null as Grupo | null }] : [];
          })()
        : pecasDaMontagem(s.m).map((i) => ({
            sku: i.sku,
            qtd: i.peca.qtd,
            grupo: (i.peca.tipo.startsWith("espeto") ? "espeto" : i.peca.tipo) as Grupo,
          }));
    root
      .querySelectorAll<HTMLButtonElement>(".onb-comprar")
      .forEach((b) => (b.disabled = itens.length === 0));
    if (!itens.length) return mostrarTotal(null, "Escolha ao menos uma peça");
    mostrarTotal(null, "Calculando…");
    const precos = await Promise.all(itens.map((i) => preco(i.sku)));
    if (g !== geracao) return;
    if (precos.some((p) => !p)) return mostrarTotal(null, "Preço indisponível agora");
    let total = 0;
    let pix = 0;
    precos.forEach((p, i) => {
      total += p!.valor * itens[i].qtd;
      pix += (p!.pix ?? p!.valor) * itens[i].qtd;
      const el = itens[i].grupo && root.querySelector(`[data-preco-grupo="${itens[i].grupo}"]`);
      if (el) el.textContent = brl(p!.valor * itens[i].qtd);
    });
    mostrarTotal(
      { valor: total, pix: pix < total ? pix : null, parcelas: null, prazo: precos[0]!.prazo },
      null,
    );
  }

  function mostrarTotal(p: Preco | null, msg: string | null) {
    root.querySelectorAll(".onb-total").forEach((el) => {
      el.innerHTML = p
        ? `<span class="v">${brl(p.valor)}</span><span class="d">${p.pix ? `${brl(p.pix)} no Pix · ` : ""}até 10x sem juros no cartão</span>`
        : `<span class="v onb-pulso">${msg}</span>`;
    });
    if (p?.prazo) $(".onb-prazo").textContent = `Produção: ${p.prazo.toLowerCase()} + frete`;
  }

  // ---------- comprar ----------
  async function comprar(btn: HTMLButtonElement) {
    const f = faixaKit(s.a, s.b);
    const nota = `Medida da churrasqueira: ${s.a}x${s.b} cm (LP Monte seu kit)`;
    const itens =
      s.modo === "kit" && f
        ? [{ sku: skuKit(f.a, f.b)!, qtd: 1, anotacao: nota }]
        : pecasDaMontagem(s.m).map((i, k) => ({
            sku: i.sku,
            qtd: i.peca.qtd,
            anotacao: k === 0 ? nota : "",
          }));
    if (!itens.length) return;
    const original = btn.innerHTML;
    root.querySelectorAll<HTMLButtonElement>(".onb-comprar").forEach((b) => (b.disabled = true));
    const erro = $(".onb-erro");
    erro.hidden = true;
    try {
      btn.innerHTML = `Colocando no carrinho…`;
      await adicionarAoCarrinho(itens);
      rastrear("AddToCart", itens.length);
      btn.innerHTML = `No carrinho ✓`;
      irParaCarrinho();
    } catch (e) {
      erro.innerHTML = `${esc((e as Error).message)} <a href="${WHATS}?text=${encodeURIComponent("Quero o kit para " + s.a + "x" + s.b + " cm")}" target="_blank" rel="noopener">Falar no WhatsApp</a>`;
      erro.hidden = false;
    } finally {
      setTimeout(() => {
        btn.innerHTML = original;
        root
          .querySelectorAll<HTMLButtonElement>(".onb-comprar")
          .forEach((b) => (b.disabled = false));
      }, 1500);
    }
  }

  function rastrear(evento: string, n: number) {
    const w = window as unknown as { fbq?: (...a: unknown[]) => void; dataLayer?: unknown[] };
    try {
      w.fbq?.("track", evento, { content_name: "Monte seu kit", num_items: n, currency: "BRL" });
      w.dataLayer?.push({
        event: "onb_lp_" + evento.toLowerCase(),
        modo: s.modo,
        medida: `${s.a}x${s.b}`,
      });
    } catch {
      /* rastreio nunca quebra a compra */
    }
  }

  // ---------- eventos ----------
  let tMedida = 0;
  root.addEventListener("input", (e) => {
    const t = e.target as HTMLInputElement;
    if (t.name !== "a" && t.name !== "b") return;
    clearTimeout(tMedida);
    tMedida = window.setTimeout(() => lerMedida(t), 350);
  });
  root.addEventListener("change", (e) => {
    const t = e.target as HTMLInputElement | HTMLSelectElement;
    if (t.name === "a" || t.name === "b") return lerMedida(t as HTMLInputElement);
    const campo = t.dataset.campo;
    if (!campo) return;
    const [g, k] = campo.split(".") as [Grupo, string];
    const alvo = s.m[g] as Record<string, unknown>;
    alvo[k] = t instanceof HTMLInputElement && t.type === "checkbox" ? t.checked : Number(t.value);
    s.m = normalizar(s.m);
    s.foco = g;
    desenhar();
  });
  root.addEventListener("click", (e) => {
    const t = e.target as HTMLElement;
    const b = t.closest<HTMLButtonElement>("button");
    if (!b || b.disabled) return;
    if (b.dataset.modo) definirModo(b.dataset.modo as Modo);
    else if (b.dataset.modoIr) definirModo(b.dataset.modoIr as Modo);
    else if (b.dataset.acao) alterar(b.dataset.grupo as Grupo, b.dataset.acao === "mais" ? 1 : -1);
    else if (b.dataset.campoSet) {
      const [g, k] = b.dataset.campoSet.split(".") as [Grupo, string];
      (s.m[g] as Record<string, unknown>)[k] = b.dataset.valor;
      desenhar();
    } else if (b.hasAttribute("data-sugerir")) {
      s.m = montagemSugerida(s.a, s.b);
      desenhar();
    } else if (b.classList.contains("onb-comprar")) comprar(b);
    else if (b.hasAttribute("data-reset")) stage?.resetView();
    else if (b.hasAttribute("data-passo")) {
      const inp = root.querySelector<HTMLInputElement>(`input[name="${b.dataset.passo}"]`)!;
      inp.value = String(Number(inp.value) + Number(b.dataset.d));
      lerMedida(inp);
    }
  });
  document.addEventListener("keydown", (e) => e.key === "Escape" && !pop.hidden && fecharPop());

  function lerMedida(inp: HTMLInputElement) {
    const [min, max] = inp.name === "a" ? [A_MIN, A_MAX] : [B_MIN, B_MAX];
    const v = Math.round(Number(inp.value));
    const ok = Number.isFinite(v) && v >= min && v <= max;
    inp.setAttribute("aria-invalid", String(!ok));
    $(`#onb-msg-${inp.name}`).textContent = ok ? "" : `Entre ${min} e ${max} cm`;
    if (!ok) return;
    if (inp.name === "a") s.a = v;
    else s.b = v;
    s.m = montagemSugerida(s.a, s.b);
    if (s.modo === "kit" && !faixaKit(s.a, s.b)) s.modo = "pecas";
    desenhar();
  }

  // dock de preço no celular: aparece quando o resumo do painel sai da tela
  const resumo = $(".onb-resumo");
  const dock = $(".onb-dock");
  const ioDock = new IntersectionObserver(
    ([e]) => dock.classList.toggle("on", !e.isIntersecting && e.boundingClientRect.top > 0),
    {
      threshold: 0,
    },
  );
  ioDock.observe(resumo);

  if (MODO_SIMULADO)
    root.insertAdjacentHTML(
      "afterbegin",
      `<p class="onb-simulado">Modo simulado (fora da loja): preços de exemplo, carrinho não é alterado.</p>`,
    );
  desenhar();
}

function esqueleto(s: Estado) {
  const campo = (
    nome: "a" | "b",
    rotulo: string,
    ajuda: string,
    min: number,
    max: number,
    v: number,
  ) => `
    <div class="onb-campo">
      <label for="onb-${nome}">${rotulo}</label>
      <div class="onb-num">
        <button type="button" data-passo="${nome}" data-d="-1" aria-label="Diminuir">−</button>
        <input id="onb-${nome}" name="${nome}" type="number" inputmode="numeric" min="${min}" max="${max}" step="1" value="${v}" aria-describedby="onb-ajuda-${nome} onb-msg-${nome}">
        <span class="onb-un">cm</span>
        <button type="button" data-passo="${nome}" data-d="1" aria-label="Aumentar">+</button>
      </div>
      <p class="onb-ajuda" id="onb-ajuda-${nome}">${ajuda}</p>
      <p class="onb-msg" id="onb-msg-${nome}" aria-live="polite"></p>
    </div>`;
  return `
  <section class="onb-hero">
    <p class="onb-eyebrow">Kit Suporte Suspenso · Aço inox 304</p>
    <h1>Monte seu kit.<br><span>Peça por peça.</span></h1>
    <p class="onb-lede">Digite a medida da sua churrasqueira e veja cada grelha e espeto encaixar no lugar, antes de comprar.</p>
  </section>

  <section class="onb-builder" aria-label="Montador do kit">
    <div class="onb-stage">
      <canvas role="img" aria-label="Kit em 3D"></canvas>
      <div class="onb-fallback" aria-hidden="true"></div>
      <div class="onb-hotspots"></div>
      <div class="onb-pop" role="dialog" aria-label="Peça escolhida" hidden></div>
      <div class="onb-carregando" aria-hidden="true"><i></i></div>
      <div class="onb-barra">
        <span class="onb-dica">Arraste para girar · toque nas peças</span>
        <button type="button" data-reset>Ver de frente</button>
      </div>
      <code class="onb-fps"></code>
    </div>

    <div class="onb-painel">
      <div class="onb-passo">
        <h2><span>1</span> Medida da sua churrasqueira</h2>
        <div class="onb-campos">
          ${campo("a", "Largura da boca", "De parede a parede, por dentro.", A_MIN, A_MAX, s.a)}
          ${campo("b", "Profundidade", "Da boca até a parede do fundo.", B_MIN, B_MAX, s.b)}
        </div>
        <details class="onb-como">
          <summary>Como medir</summary>
          <svg viewBox="0 0 240 120" role="img" aria-label="Churrasqueira vista de cima: a largura vai de parede a parede e a profundidade da boca até o fundo">
            <rect x="40" y="16" width="160" height="88" rx="4" fill="none" stroke="currentColor" stroke-width="6"/>
            <path d="M46 60h148" stroke="var(--onb-laranja)" stroke-width="2" marker-start="url(#onb-s)" marker-end="url(#onb-s)"/>
            <path d="M120 22v76" stroke="var(--onb-laranja)" stroke-width="2" stroke-dasharray="4 3"/>
            <text x="120" y="54" text-anchor="middle" font-size="11" fill="currentColor">largura</text>
            <text x="126" y="92" font-size="11" fill="currentColor">profundidade</text>
            <text x="120" y="118" text-anchor="middle" font-size="10" fill="currentColor" opacity=".6">boca (frente)</text>
            <defs><marker id="onb-s" viewBox="0 0 6 6" refX="3" refY="3" markerWidth="6" markerHeight="6" orient="auto"><circle cx="3" cy="3" r="2.5" fill="var(--onb-laranja)"/></marker></defs>
          </svg>
        </details>
      </div>

      <div class="onb-passo">
        <h2><span>2</span> Como você quer montar?</h2>
        <div class="onb-modos" role="group" aria-label="Forma de montar">
          <button type="button" data-modo="kit" aria-pressed="${s.modo === "kit"}"><strong>Kit completo</strong><small>Tudo calculado pela fábrica para a sua medida</small></button>
          <button type="button" data-modo="pecas" aria-pressed="${s.modo === "pecas"}"><strong>Peça por peça</strong><small>Escolha o que entra, toque no 3D para adicionar</small></button>
        </div>
        <p class="onb-faixa"></p>
      </div>

      <div class="onb-passo">
        <h2><span>3</span> O que vai no seu kit</h2>
        <div id="onb-conteudo"></div>
      </div>

      <div class="onb-passo onb-resumo">
        <div class="onb-total" aria-live="polite"></div>
        <p class="onb-prazo"></p>
        <button type="button" class="onb-comprar">Comprar agora</button>
        <p class="onb-erro" role="alert" hidden></p>
        <ul class="onb-garantias">
          <li>Frete calculado com o seu CEP no carrinho</li>
          <li>Pix, boleto ou cartão em até 10x — checkout seguro da loja</li>
          <li>Inox 304 alimentício · 15 anos de garantia</li>
        </ul>
      </div>
    </div>
  </section>

  <section class="onb-porque" aria-label="Por que Olho na Brasa">
    <article><h3>Sob medida de verdade</h3><p>Cada peça sai na medida da sua churrasqueira. Nada de grelha sobrando ou faltando.</p></article>
    <article><h3>Inox 304 espelhado</h3><p>O mesmo aço de cozinha industrial. Não enferruja, não solta gosto, limpa com água e sabão.</p></article>
    <article><h3>Direto da fábrica</h3><p>Feito em Santa Catarina por quem fabrica, com 15 anos de garantia.</p></article>
  </section>

  <section class="onb-faq" aria-label="Perguntas frequentes">
    <h2>Perguntas rápidas</h2>
    <details><summary>Precisa de obra para instalar?</summary><p>Não. O suporte fixa na parede interna da churrasqueira com os pés e parafusos que vão junto.</p></details>
    <details><summary>Minha medida não é redonda. E agora?</summary><p>O kit é feito em faixas de 5 em 5 cm e sempre arredonda para baixo, para caber com folga. A sua medida exata vai junto no pedido.</p></details>
    <details><summary>Já tenho suporte, posso comprar só grelhas?</summary><p>Pode. Em "Peça por peça", desmarque o suporte e escolha só o que falta.</p></details>
    <details><summary>Como fica o frete?</summary><p>Você vê o valor e o prazo no carrinho, com o seu CEP, antes de pagar.</p></details>
  </section>

  <div class="onb-dock" aria-hidden="false">
    <div class="onb-total"></div>
    <button type="button" class="onb-comprar">Comprar</button>
  </div>`;
}

const raiz = document.getElementById("onb-kit-lp");
if (raiz && !raiz.classList.contains("onb-pronto")) {
  const estilo = document.createElement("style");
  estilo.id = "onb-kit-lp-css";
  estilo.textContent = css;
  document.head.appendChild(estilo);
  iniciar(raiz);
}
