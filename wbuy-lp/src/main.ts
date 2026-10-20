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
import { ACESSORIOS, COOKTOP_SKU, MEDIDAS } from "./catalog";
import type { Composicao } from "@/lib/kitComposition";
import {
  adicionarAoCarrinho,
  irParaCarrinho,
  MODO_SIMULADO,
  preco,
  type ItemCarrinho,
} from "./wbuy";
import type { BuilderStage } from "./builderStage";
import type { Acessorios, Ambiente, Instalacao } from "./cena3d";
import { desenhoFrente } from "./fallback";

const ASSET_BASE: string = import.meta.env.DEV ? "/" : "https://premium.olhonabrasa.com.br/";
const IMG = ASSET_BASE + "wbuy-lp/img/";
const VIDEOS_CLIENTE = "https://olho-na-brasa-premium.lovable.app/__l5e/assets-v1/";
const WHATS = "https://wa.me/554740420956";
const MAPS =
  "https://www.google.com/maps/place/Olho+na+Brasa/@-27.1016701,-48.6187495,738m/data=!3m1!1e3!4m8!3m7!1s0x94d8b100c4230f17:0x899b6cbbbfaceb99!8m2!3d-27.1016701!4d-48.6161746!9m1!1b1!16s%2Fg%2F11rzr1kln5";

type Modo = "kit" | "pecas";
type AccId = keyof Acessorios;
type Estado = {
  a: number;
  b: number;
  modo: Modo;
  m: Montagem;
  foco: Grupo | null;
  inst: Instalacao;
  amb: Ambiente;
  acc: Acessorios;
};

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const foto = (nome: string, alt: string, w: number, h: number, cls = "", eager = false) =>
  `<img src="${IMG}${nome}.webp" alt="${esc(alt)}" width="${w}" height="${h}"${cls ? ` class="${cls}"` : ""} ${
    eager ? 'fetchpriority="high"' : 'loading="lazy"'
  } decoding="async">`;

const INFO: Record<Grupo, { titulo: string; sub: string }> = {
  suporte: {
    titulo: "Suporte",
    sub: "A estrutura de 3 níveis onde tudo encaixa: grelha embaixo, espetos no meio, descanso em cima.",
  },
  uruguaia: {
    titulo: "Grelhas",
    sub: "Uruguaia, com varões em V que escorrem a gordura. Argentina, com canaletas que levam a gordura para fora da brasa.",
  },
  descanso: {
    titulo: "Grelha de descanso",
    sub: "No nível de cima, segura a carne pronta quente sem passar do ponto.",
  },
  espeto: {
    titulo: "Espetos",
    sub: "Duplo segura a peça sem girar. Barra chata para cortes grandes. V para linguiça e coração.",
  },
};

const AMBIENTES: { id: Ambiente; nome: string; sub: string }[] = [
  { id: "fechada", nome: "Fechada", sub: "Alvenaria tradicional" },
  { id: "lateral", nome: "Abertura lateral", sub: "Com vidro de um lado" },
  { id: "bancada", nome: "Bancada", sub: "Braseiro embutido" },
  { id: "gourmet", nome: "Nicho gourmet", sub: "Granito e inox" },
  { id: "estudio", nome: "Só o kit", sub: "Sem churrasqueira" },
];

const ACC_INFO: Record<AccId, { titulo: string; texto: string }> = {
  giratorio: {
    titulo: "Espeto giratório com motor",
    texto: "Gira sozinho no ponto da brasa. Vem com o cesto de miúdos.",
  },
  cesto: {
    titulo: "Cesto de miúdos",
    texto: "Coração, linguicinha e queijo assam por igual, sem cair.",
  },
  bandeja: {
    titulo: "Bandeja de coração",
    texto: "Chapa perfurada no espeto. Coração dourado sem espetar um por um.",
  },
};

const REVIEWS = [
  {
    quote:
      "Produto de excelente qualidade, com um pré e pós venda excelentes. Entregam o que prometem. Customizam seu pedido e orientam com segurança na retirada das medidas e como fazer sua instalação.",
    author: "Luiz Carlos Crab",
  },
  {
    quote:
      "Adquiri o suporte suspenso para espetos e uma grelha de descanso. Informei as medidas da minha churrasqueira e logo recebi o link com os valores. Recebi em casa muito antes do prazo.",
    author: "Cliente Google",
  },
  { quote: "Produto de extrema qualidade. Superou as expectativas.", author: "Diego Macedo" },
];

const VIDEOS = [
  [
    "70b8fd32-44f4-41db-b3cc-db03b92ea129/video-cliente-1.mp4",
    "70362e66-6be1-400e-8690-d66115d34b0e/poster-cliente-1.jpg",
    "Kit instalado",
  ],
  [
    "130136b1-821e-4efb-8aa6-bf5adf20ac0f/video-cliente-2.mp4",
    "582c1dd7-9d4f-4fa8-bddf-d74a80a53615/poster-cliente-2.jpg",
    "Reação ao receber",
  ],
  [
    "6955bfb5-f929-4bdb-a19d-e26903cce8ab/video-cliente-4.mp4",
    "6ae0da39-5bfc-4960-b07b-ab12f8e142d9/poster-cliente-4.jpg",
    "Encaixe sob medida",
  ],
  [
    "da069deb-c758-4daa-b488-d23e8abbfb54/video-cliente-5.mp4",
    "b6419e92-cbed-4c73-aa32-5ddeaff1978e/poster-cliente-5.jpg",
    "Primeiro churrasco",
  ],
];

/** Cada destaque é um trecho do vídeo do kit em uso (cortado em wbuy-lp/public-img/dest-*.mp4). */
const DESTAQUES = [
  {
    id: "suporte",
    titulo: "Três alturas de brasa.",
    texto: "Um suporte só, cortado na medida da sua churrasqueira.",
  },
  {
    id: "inox",
    titulo: "Inox 304 alimentício.",
    texto: "Não enferruja, não passa gosto e tem 15 anos de garantia.",
  },
  {
    id: "giratorio",
    titulo: "Espeto giratório.",
    texto: "Gira sozinho no ponto da brasa enquanto você cuida do resto.",
  },
  {
    id: "duplo",
    titulo: "Espeto duplo.",
    texto: "Duas pontas seguram a peça. A carne não gira e o ponto não escapa.",
  },
  {
    id: "simples",
    titulo: "Espeto simples.",
    texto: "Para linguiça, coração e queijo. Entra e sai sem esforço.",
  },
  {
    id: "descanso",
    titulo: "Grelha auxiliar.",
    texto: "Lá em cima, segura a carne pronta quente sem passar do ponto.",
  },
  {
    id: "uruguaia",
    titulo: "Grelha uruguaia.",
    texto: "Varões em V escorrem a gordura. Menos labareda, mais sabor.",
  },
];
const DESTAQUE_MS = 5200;

function iniciar(root: HTMLElement) {
  const params = new URLSearchParams(location.search);
  const a0 = Number(params.get("a")) || 70;
  const b0 = Number(params.get("b")) || 60;
  const inst: Instalacao = params.get("inst") === "cooktop" ? "cooktop" : "suspenso";
  const ambParam = params.get("amb") as Ambiente | null;
  const s: Estado = {
    a: a0,
    b: b0,
    modo: params.get("modo") === "pecas" ? "pecas" : "kit",
    m: montagemSugerida(a0, b0),
    foco: null,
    inst,
    amb:
      ambParam && AMBIENTES.some((x) => x.id === ambParam)
        ? ambParam
        : inst === "cooktop"
          ? "bancada"
          : "lateral",
    acc: { cesto: false, giratorio: false, bandeja: false },
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
      { rootMargin: "300px 0px" },
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
    if (!parte) return fecharPop();
    stage?.highlight(parte);
    if (parte.startsWith("acc_")) return abrirPopExtra("acc", parte, x, y);
    if (parte === "cooktop_base") return abrirPopExtra("cooktop", parte, x, y);
    const g = grupoDaParte(parte);
    s.foco = g;
    if (!g) return fecharPop();
    abrirPop(g, x, y);
    marcarCartao(g);
  }

  function posPop(x: number, y: number) {
    const w = stageEl.clientWidth;
    pop.style.left = Math.min(Math.max(x, 115), w - 115) + "px";
    pop.style.top = Math.max(y - 12, 76) + "px";
    pop.hidden = false;
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
    posPop(x, y);
  }

  function abrirPopExtra(tipo: "acc" | "cooktop", parte: string, x: number, y: number) {
    if (tipo === "cooktop") {
      pop.innerHTML = `<strong>Encaixe cooktop</strong><span>Apoia na bancada, sem furar a parede</span><button type="button" data-pop="suspenso">Trocar para suspenso</button>`;
    } else {
      const id = parte.replace("acc_", "") as AccId;
      pop.innerHTML = `<strong>${ACC_INFO[id].titulo}</strong><span>${ACC_INFO[id].texto}</span><button type="button" data-pop="tirar-acc" data-acc="${id}">Tirar do kit</button>`;
    }
    pop.dataset.grupo = "";
    posPop(x, y);
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
    else if (acao === "suspenso") definirInstalacao("suspenso");
    else if (acao === "tirar-acc") alternarAcessorio(b.dataset.acc as AccId, false);
    fecharPop();
  });

  function rotuloGrupo(g: Grupo) {
    if (s.modo === "kit" && compAtual) {
      const c = compAtual;
      if (g === "suporte") return `${c.suporteLarguraCm} cm · 3 níveis`;
      if (g === "uruguaia")
        return `${c.uruguaia.quantidade}× uruguaia ${c.uruguaia.larguraCm}×${c.uruguaia.comprimentoCm} cm`;
      if (g === "descanso")
        return c.descanso ? `${c.descanso.quantidade}× ${c.descanso.larguraCm} cm` : "";
      return `${c.espetos.quantidade}× duplo ${c.espetos.comprimentoCm} cm`;
    }
    const m = s.m;
    if (g === "suporte")
      return m.suporte.on ? `${m.suporte.larguraCm} cm · 3 níveis` : "Ainda não incluído";
    if (g === "uruguaia")
      return `${m.uruguaia.qtd}× ${m.uruguaia.tipo} ${m.uruguaia.larguraCm}×${m.uruguaia.comprimentoCm} cm`;
    if (g === "descanso") return `${m.descanso.qtd}× ${m.descanso.larguraCm} cm`;
    const tipo = { espeto_duplo: "duplo", espeto_chata: "barra chata", espeto_v: "V" }[
      m.espeto.tipo
    ];
    return `${m.espeto.qtd}× ${tipo} ${m.espeto.comprimentoCm} cm`;
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
  const comSuporte = () => (s.modo === "kit" ? !!faixaKit(s.a, s.b) : s.m.suporte.on);

  function desenhar() {
    compAtual = s.modo === "kit" ? composicaoKit(s.a, s.b) : composicaoMontagem(s.m, s.b);
    if (compAtual) {
      const fantasma = s.modo === "pecas" && !s.m.suporte.on ? ["suporte"] : [];
      stage?.update(compAtual, {
        fantasma,
        instalacao: s.inst,
        ambiente: s.amb,
        grelha: s.modo === "pecas" ? s.m.uruguaia.tipo : "uruguaia",
        acessorios: s.acc,
        boca: { a: s.a, b: s.b },
      });
      $(".onb-fallback").innerHTML = desenhoFrente(compAtual, fantasma.length > 0);
      canvas.setAttribute("aria-label", descreverParaLeitor());
    }
    montarHotspots();
    renderEscolhas();
    renderConteudo();
    renderAcessorios();
    atualizarPreco();
  }

  function descreverParaLeitor() {
    const itens =
      s.modo === "kit" && compAtual
        ? conteudoKit(compAtual, s.inst === "cooktop")
        : pecasDaMontagem(s.m).map((i) => `${i.peca.qtd}× ${i.rotulo}`);
    const amb = AMBIENTES.find((x) => x.id === s.amb)!.nome.toLowerCase();
    return `Kit ${s.inst} em 3D, churrasqueira ${amb} de ${s.a} por ${s.b} cm: ${itens.join(", ")}.`;
  }

  function renderEscolhas() {
    root
      .querySelectorAll<HTMLButtonElement>(".onb-painel [data-inst]")
      .forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.inst === s.inst)));
    root
      .querySelectorAll<HTMLButtonElement>("[data-amb]")
      .forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.amb === s.amb)));
    $(".onb-etiqueta-palco").textContent =
      (s.inst === "cooktop" ? "Cooktop" : "Suspenso") +
      " · " +
      AMBIENTES.find((x) => x.id === s.amb)!.nome;
  }

  function renderConteudo() {
    const f = faixaKit(s.a, s.b);
    root.querySelectorAll<HTMLButtonElement>(".onb-painel [data-modo]").forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset.modo === s.modo));
      if (b.dataset.modo === "kit") b.disabled = !f;
    });
    $(".onb-faixa").innerHTML = f
      ? `Kit da faixa <strong>${f.a}×${f.b} cm</strong>, para a sua boca de ${s.a}×${s.b} cm.`
      : `Sua medida está fora das faixas do kit completo (50–99 × 40–74 cm). Monte peça por peça ou <a href="${WHATS}" target="_blank" rel="noopener">fale com a fábrica</a>.`;

    if (s.modo === "kit") {
      const c = compAtual;
      conteudo.innerHTML = c
        ? `<ul class="onb-lista">${conteudoKit(c, s.inst === "cooktop")
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
    const seg = (campo: string, atual: string, opcoes: [string, string][], rotulo: string) =>
      `<div class="onb-seg" role="group" aria-label="${rotulo}">${opcoes
        .map(
          ([v, n]) =>
            `<button type="button" data-campo-set="${campo}" data-valor="${v}" aria-pressed="${atual === v}">${n}</button>`,
        )
        .join("")}</div>`;
    const cartao = (g: Grupo, corpo: string, ativo: boolean) =>
      `<article class="onb-card${ativo ? "" : " vazio"}${s.foco === g ? " foco" : ""}" data-cartao="${g}" tabindex="-1">
        <header><h4>${INFO[g].titulo}</h4><p class="onb-preco-peca" data-preco-grupo="${g}"></p></header>
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
        `${seg(
          "uruguaia.tipo",
          m.uruguaia.tipo,
          [
            ["uruguaia", "Uruguaia"],
            ["argentina", "Argentina"],
          ],
          "Tipo de grelha",
        )}
        <div class="onb-row">
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
        `${seg(
          "espeto.tipo",
          m.espeto.tipo,
          [
            ["espeto_duplo", "Duplo"],
            ["espeto_chata", "Barra chata"],
            ["espeto_v", "V"],
          ],
          "Tipo de espeto",
        )}
        <div class="onb-row">
          <label>Comprimento <select data-campo="espeto.comprimentoCm">${opt(MEDIDAS.espeto, m.espeto.comprimentoCm)}</select></label>
          ${stepper("espeto", m.espeto.qtd, cap.espeto)}
        </div>`,
        m.espeto.qtd > 0,
      ),
      `<button type="button" class="onb-link" data-sugerir>Voltar às peças sugeridas para ${s.a}×${s.b} cm</button>`,
    ].join("");
  }

  function renderAcessorios() {
    root.querySelectorAll<HTMLButtonElement>("[data-acc-toggle]").forEach((b) => {
      const id = b.dataset.accToggle as AccId;
      const incluido = id === "cesto" && s.acc.giratorio;
      const on = s.acc[id] || incluido;
      b.setAttribute("aria-pressed", String(on));
      b.disabled = incluido;
      const rot = b.querySelector(".onb-acc-acao");
      if (rot)
        rot.textContent = incluido ? "Já vem no combo" : on ? "No seu kit ✓" : "Adicionar ao kit";
    });
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

  function definirInstalacao(inst: Instalacao) {
    s.inst = inst;
    // churrasqueira coerente com a escolha, a menos que o cliente já tenha escolhido outra
    if (inst === "cooktop" && s.amb === "fechada") s.amb = "bancada";
    if (inst === "suspenso" && s.amb === "bancada") s.amb = "lateral";
    desenhar();
  }

  function alternarAcessorio(id: AccId, on?: boolean) {
    s.acc[id] = on ?? !s.acc[id];
    if (id === "giratorio" && s.acc.giratorio) s.acc.cesto = false;
    desenhar();
  }

  // ---------- carrinho e preço ----------
  type Item = ItemCarrinho & { grupo: Grupo | null };
  function itensCarrinho(): Item[] {
    const f = faixaKit(s.a, s.b);
    const nota = `Medida da churrasqueira: ${s.a}x${s.b} cm · ${s.inst} · ${s.amb} (LP Monte seu kit)`;
    const base: Item[] =
      s.modo === "kit"
        ? f
          ? [{ sku: skuKit(f.a, f.b)!, qtd: 1, anotacao: nota, grupo: null }]
          : []
        : pecasDaMontagem(s.m).map((i, k) => ({
            sku: i.sku,
            qtd: i.peca.qtd,
            anotacao: k === 0 ? nota : "",
            grupo: (i.peca.tipo.startsWith("espeto")
              ? "espeto"
              : i.peca.tipo === "argentina"
                ? "uruguaia"
                : i.peca.tipo) as Grupo,
          }));
    if (s.inst === "cooktop" && comSuporte()) base.push({ sku: COOKTOP_SKU, qtd: 1, grupo: null });
    (Object.keys(s.acc) as AccId[]).forEach((id) => {
      if (s.acc[id]) base.push({ sku: ACESSORIOS[id].sku, qtd: 1, grupo: null });
    });
    return base;
  }

  let geracao = 0;
  async function atualizarPreco() {
    const g = ++geracao;
    const itens = itensCarrinho();
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
    mostrarTotal({ valor: total, pix: pix < total ? pix : null }, null);
    const prazo = precos.find((p) => p!.prazo)?.prazo;
    if (prazo) $(".onb-prazo").textContent = `Produção: ${prazo.toLowerCase()} + frete`;
  }

  function mostrarTotal(p: { valor: number; pix: number | null } | null, msg: string | null) {
    root.querySelectorAll(".onb-total").forEach((el) => {
      el.innerHTML = p
        ? `<span class="v">${brl(p.valor)}</span><span class="d">${p.pix ? `${brl(p.pix)} no Pix · ` : ""}até 10x sem juros</span>`
        : `<span class="v onb-pulso">${msg}</span>`;
    });
    root
      .querySelectorAll(".onb-barra-preco")
      .forEach((el) => (el.textContent = p ? brl(p.valor) : ""));
  }

  // preço dos acessórios nos cartões (uma consulta por acessório, guardada na visita)
  (Object.keys(ACESSORIOS) as AccId[]).forEach((id) =>
    preco(ACESSORIOS[id].sku).then((p) => {
      if (!p) return;
      root
        .querySelectorAll(`[data-preco-acc="${id}"]`)
        .forEach((el) => (el.textContent = brl(p.valor)));
    }),
  );

  async function comprar(btn: HTMLButtonElement) {
    const itens = itensCarrinho();
    if (!itens.length) return;
    const original = btn.innerHTML;
    root.querySelectorAll<HTMLButtonElement>(".onb-comprar").forEach((b) => (b.disabled = true));
    const erro = $(".onb-erro");
    erro.hidden = true;
    try {
      btn.innerHTML = `Colocando no carrinho…`;
      await adicionarAoCarrinho(itens.map(({ sku, qtd, anotacao }) => ({ sku, qtd, anotacao })));
      rastrear("AddToCart", itens.length);
      btn.innerHTML = `No carrinho ✓`;
      irParaCarrinho();
    } catch (e) {
      erro.innerHTML = `${esc((e as Error).message)} <a href="${WHATS}?text=${encodeURIComponent(
        `Quero o kit ${s.inst} para ${s.a}x${s.b} cm`,
      )}" target="_blank" rel="noopener">Falar no WhatsApp</a>`;
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
        instalacao: s.inst,
        medida: `${s.a}x${s.b}`,
      });
    } catch {
      /* rastreio nunca quebra a compra */
    }
  }

  const irMontador = () =>
    $("#onb-montador").scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });

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
    if (b.dataset.modo) {
      definirModo(b.dataset.modo as Modo);
      if (!b.closest(".onb-painel")) irMontador();
    } else if (b.dataset.modoIr) definirModo(b.dataset.modoIr as Modo);
    else if (b.dataset.inst) {
      definirInstalacao(b.dataset.inst as Instalacao);
      if (b.hasAttribute("data-ir")) irMontador();
    } else if (b.dataset.amb) {
      s.amb = b.dataset.amb as Ambiente;
      desenhar();
    } else if (b.dataset.accToggle) alternarAcessorio(b.dataset.accToggle as AccId);
    else if (b.dataset.acao) alterar(b.dataset.grupo as Grupo, b.dataset.acao === "mais" ? 1 : -1);
    else if (b.dataset.campoSet) {
      const [g, k] = b.dataset.campoSet.split(".") as [Grupo, string];
      (s.m[g] as Record<string, unknown>)[k] = b.dataset.valor;
      desenhar();
    } else if (b.hasAttribute("data-sugerir")) {
      s.m = montagemSugerida(s.a, s.b);
      desenhar();
    } else if (b.classList.contains("onb-comprar")) comprar(b);
    else if (b.hasAttribute("data-ir-montador")) irMontador();
    else if (b.hasAttribute("data-reset")) stage?.resetView();
    else if (b.hasAttribute("data-video")) tocarVideo(b);
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
    const tipo = s.m.uruguaia.tipo;
    s.m = montagemSugerida(s.a, s.b);
    s.m.uruguaia.tipo = tipo;
    if (s.modo === "kit" && !faixaKit(s.a, s.b)) s.modo = "pecas";
    desenhar();
  }

  function tocarVideo(b: HTMLButtonElement) {
    const v = document.createElement("video");
    v.src = b.dataset.video!;
    v.controls = true;
    v.playsInline = true;
    v.autoplay = true;
    v.poster = b.dataset.poster ?? "";
    v.className = "onb-video-tocando";
    b.replaceWith(v);
  }

  // vídeo do cooktop: toca mudo (já tem legenda) só quando aparece na tela
  const vCook = root.querySelector<HTMLVideoElement>(".onb-video-cooktop");
  if (vCook && !reduced) {
    new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) vCook.play().catch(() => {});
        else vCook.pause();
      },
      { threshold: 0.4 },
    ).observe(vCook);
  }

  // ---------- destaques: carrossel de vídeos curtos, um por peça ----------
  const trilho = $(".onb-dest-trilho");
  const cards = [...root.querySelectorAll<HTMLElement>(".onb-dest-card")];
  const pontos = [...root.querySelectorAll<HTMLButtonElement>("[data-dest]")];
  const btnPlay = $<HTMLButtonElement>("[data-dest-play]");
  let atual = 0;
  let tocando = !reduced;
  let destVisivel = false;
  let timer = 0;

  function irDestaque(i: number, rolar = true) {
    atual = (i + cards.length) % cards.length;
    pontos.forEach((p, k) => p.toggleAttribute("aria-current", k === atual));
    root.style.setProperty("--onb-dest-ms", DESTAQUE_MS + "ms");
    if (rolar) {
      const c = cards[atual];
      trilho.scrollTo({
        left: c.offsetLeft - (trilho.clientWidth - c.clientWidth) / 2,
        behavior: reduced ? "auto" : "smooth",
      });
    }
    cards.forEach((c, k) => {
      const v = c.querySelector("video")!;
      if (k === atual && destVisivel && tocando) {
        v.preload = "auto";
        v.play().catch(() => {});
      } else v.pause();
      c.classList.toggle("ativo", k === atual);
    });
    // pré-carrega o próximo para a troca não piscar
    const prox = cards[(atual + 1) % cards.length].querySelector("video")!;
    if (destVisivel) prox.preload = "auto";
    clearTimeout(timer);
    trilho.closest("section")!.classList.toggle("tocando", destVisivel && tocando);
    if (destVisivel && tocando) timer = window.setTimeout(() => irDestaque(atual + 1), DESTAQUE_MS);
  }
  pontos.forEach((p, k) => p.addEventListener("click", () => irDestaque(k)));
  btnPlay.addEventListener("click", () => {
    tocando = !tocando;
    btnPlay.classList.toggle("pausado", !tocando);
    btnPlay.setAttribute("aria-label", tocando ? "Pausar destaques" : "Tocar destaques");
    irDestaque(atual, false);
  });
  btnPlay.classList.toggle("pausado", !tocando);
  // arrastar/rolar o trilho na mão escolhe o cartão mais centralizado
  let tRolagem = 0;
  trilho.addEventListener(
    "scroll",
    () => {
      clearTimeout(tRolagem);
      tRolagem = window.setTimeout(() => {
        const meio = trilho.scrollLeft + trilho.clientWidth / 2;
        let melhor = 0;
        cards.forEach((c, k) => {
          const d = Math.abs(c.offsetLeft + c.clientWidth / 2 - meio);
          const dm = Math.abs(cards[melhor].offsetLeft + cards[melhor].clientWidth / 2 - meio);
          if (d < dm) melhor = k;
        });
        if (melhor !== atual) irDestaque(melhor, false);
      }, 120);
    },
    { passive: true },
  );
  cards.forEach((c, k) => c.addEventListener("click", () => k !== atual && irDestaque(k)));
  new IntersectionObserver(
    ([e]) => {
      destVisivel = e.isIntersecting;
      irDestaque(atual, false);
    },
    { threshold: 0.35 },
  ).observe(trilho);

  // vídeo da troca de altura (abre por cima da página)
  const modal = $<HTMLDialogElement>(".onb-modal");
  const vModal = modal.querySelector("video")!;
  root.querySelector("[data-video-modal]")?.addEventListener("click", () => {
    if (typeof modal.showModal === "function") modal.showModal();
    else modal.setAttribute("open", "");
    vModal.preload = "auto";
    vModal.currentTime = 0;
    vModal.play().catch(() => {});
    clearTimeout(timer);
  });
  const fecharModal = () => {
    vModal.pause();
    modal.close?.();
    modal.removeAttribute("open");
    irDestaque(atual, false);
  };
  modal.addEventListener("click", (e) => {
    if (e.target === modal || (e.target as HTMLElement).closest("[data-fechar-modal]"))
      fecharModal();
  });
  modal.addEventListener("close", () => {
    vModal.pause();
    irDestaque(atual, false);
  });

  // barra do produto (desktop) e dock (celular): aparecem depois do topo, somem no resumo
  const resumo = $(".onb-resumo");
  const dock = $(".onb-dock");
  const barra = $(".onb-barra-produto");
  const hero = $(".onb-hero");
  let resumoVisivel = false;
  let heroVisivel = true;
  const atualizarBarras = () => {
    dock.classList.toggle("on", !resumoVisivel && !heroVisivel);
    barra.classList.toggle("on", !heroVisivel);
  };
  new IntersectionObserver(([e]) => {
    resumoVisivel = e.isIntersecting;
    atualizarBarras();
  }).observe(resumo);
  new IntersectionObserver(([e]) => {
    heroVisivel = e.isIntersecting;
    atualizarBarras();
  }).observe(hero);

  // dobras entram com um leve movimento (o conteúdo já está visível sem isso)
  if (!reduced) {
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visto");
            io.unobserve(e.target);
          }
        }),
      { rootMargin: "0px 0px -8% 0px" },
    );
    root.querySelectorAll(".onb-sobe").forEach((el) => io.observe(el));
    root.classList.add("onb-anima");
  }

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
  const acc = (id: AccId, img: string, alt: string) => `
    <button type="button" class="onb-acc" data-acc-toggle="${id}" aria-pressed="false">
      ${foto(img, alt, 500, 500)}
      <span class="onb-acc-txt"><strong>${ACC_INFO[id].titulo}</strong><small>${ACC_INFO[id].texto}</small></span>
      <span class="onb-acc-pe"><span class="onb-acc-preco" data-preco-acc="${id}"></span><span class="onb-acc-acao">Adicionar ao kit</span></span>
    </button>`;
  const accCard = (
    id: AccId,
    img: string,
    alt: string,
    w: number,
    h: number,
    titulo: string,
    texto: string,
    largo = false,
  ) => `
    <article class="onb-acc-card${largo ? " onb-acc-largo" : ""} onb-sobe">
      ${foto(img, alt, w, h)}
      <div><h3>${titulo}</h3><p>${texto}</p>
      <button type="button" class="onb-btn-sec" data-acc-toggle="${id}" aria-pressed="false"><span class="onb-acc-acao">Adicionar ao kit</span> <span class="onb-acc-preco" data-preco-acc="${id}"></span></button></div>
    </article>`;

  return `
  <div class="onb-barra-produto">
    <div class="onb-barra-dentro">
      <strong>Kit Premium</strong>
      <span class="onb-barra-preco"></span>
      <button type="button" class="onb-btn-pq" data-ir-montador>Montar o meu</button>
    </div>
  </div>

  <section class="onb-hero onb-escuro" aria-label="Apresentação">
    <div class="onb-dentro onb-hero-txt">
      <p class="onb-eyebrow">Kit Premium Olho na Brasa</p>
      <h1>A melhor churrasqueira começa por dentro.</h1>
      <p class="onb-lede">Suporte suspenso ou cooktop em aço inox 304 espelhado, feito na medida exata da sua churrasqueira. Para quem ama assar carne e não aceita menos que o melhor.</p>
      <div class="onb-ctas">
        <button type="button" class="onb-btn" data-ir-montador>Monte o seu em 3D</button>
      </div>
      <p class="onb-prova"><span class="onb-estrelas" aria-hidden="true">★★★★★</span> +100 mil churrasqueiras entregues</p>
    </div>
    <figure class="onb-hero-foto">${foto("cooktop-showroom", "Kit cooktop em inox espelhado instalado em bancada de granito, com grelhas, espetos e gaveta", 1600, 1600, "", true)}</figure>
  </section>

  <section class="onb-destaques onb-escuro" aria-labelledby="onb-dest-t">
    <div class="onb-dentro onb-dest-topo">
      <h2 id="onb-dest-t">Comece pelos destaques.</h2>
      <button type="button" class="onb-btn-link onb-dest-video" id="video-headline" data-video-modal>Assistir ao vídeo <span class="onb-ico-play" aria-hidden="true"></span></button>
    </div>
    <div class="onb-dest-trilho" tabindex="0" aria-roledescription="carrossel" aria-label="Destaques do kit em uso">
      ${DESTAQUES.map(
        (d, i) => `
      <article class="onb-dest-card" aria-roledescription="slide" aria-label="${i + 1} de ${DESTAQUES.length}">
        <video src="${IMG}dest-${d.id}.mp4" poster="${IMG}dest-${d.id}.webp" muted loop playsinline preload="none" aria-hidden="true"></video>
        <p class="onb-dest-txt"><strong>${d.titulo}</strong> ${d.texto}</p>
      </article>`,
      ).join("")}
    </div>
    <div class="onb-dest-ctrl">
      <div class="onb-dest-pontos" role="group" aria-label="Escolher destaque">
        ${DESTAQUES.map((d, i) => `<button type="button" data-dest="${i}" aria-label="${d.titulo.replace(".", "")}"${i === 0 ? ' aria-current="true"' : ""}><i></i></button>`).join("")}
      </div>
      <button type="button" class="onb-dest-play" data-dest-play aria-label="Pausar destaques"><span aria-hidden="true"></span></button>
    </div>
  </section>

  <section class="onb-formas onb-claro" id="onb-formas" aria-labelledby="onb-formas-t">
    <div class="onb-dentro">
      <h2 id="onb-formas-t" class="onb-sobe">Suspenso ou cooktop.<br><span>Do jeito da sua churrasqueira.</span></h2>
      <div class="onb-formas-grade">
        <article class="onb-forma onb-sobe">
          <div class="onb-forma-midia">${foto("nicho-lateral", "Kit suspenso fixado no fundo de uma churrasqueira de mármore com abertura lateral de vidro", 1280, 960)}</div>
          <div class="onb-forma-txt">
            <h3>Suspenso.</h3>
            <p>Parafusado na parede do fundo. A boca fica livre e tudo trabalha em três alturas de brasa.</p>
            <button type="button" class="onb-btn-sec" data-inst="suspenso" data-ir>Montar suspenso</button>
          </div>
        </article>
        <article class="onb-forma onb-forma-destaque onb-sobe">
          <span class="onb-selo">O mais pedido</span>
          <div class="onb-forma-midia">
            <video class="onb-video-cooktop" src="${IMG}cooktop-rodrigo.mp4" poster="${IMG}cooktop-rodrigo.webp" muted loop playsinline preload="none" aria-label="Rodrigo, da Olho na Brasa, apresenta o suporte com encaixe cooktop"></video>
          </div>
          <div class="onb-forma-txt">
            <h3>Cooktop.</h3>
            <p>Encaixa na bancada, em volta do braseiro. Para quem não quer furar o fundo da churrasqueira, seja granito ou inox.</p>
            <button type="button" class="onb-btn-sec" data-inst="cooktop" data-ir>Montar cooktop</button>
          </div>
        </article>
      </div>
    </div>
  </section>

  <section class="onb-montador onb-claro" id="onb-montador" aria-labelledby="onb-montador-t">
    <div class="onb-dentro onb-montador-topo">
      <h2 id="onb-montador-t">Monte o seu.<br><span>Veja antes de comprar.</span></h2>
    </div>
    <div class="onb-builder">
      <div class="onb-stage">
        <canvas role="img" aria-label="Kit em 3D"></canvas>
        <div class="onb-fallback" aria-hidden="true"></div>
        <div class="onb-hotspots"></div>
        <div class="onb-pop" role="dialog" aria-label="Peça escolhida" hidden></div>
        <div class="onb-carregando" aria-hidden="true"><i></i></div>
        <span class="onb-etiqueta-palco"></span>
        <div class="onb-barra">
          <span class="onb-dica">Arraste para girar · toque nas peças</span>
          <button type="button" data-reset>Ver de frente</button>
        </div>
        <code class="onb-fps"></code>
      </div>

      <div class="onb-painel">
        <div class="onb-passo">
          <h3 class="onb-passo-t"><span>1</span> Como vai instalar?</h3>
          <div class="onb-modos" role="group" aria-label="Instalação">
            <button type="button" data-inst="suspenso" aria-pressed="${s.inst === "suspenso"}"><strong>Suspenso</strong><small>Parafusado no fundo da churrasqueira</small></button>
            <button type="button" data-inst="cooktop" aria-pressed="${s.inst === "cooktop"}"><strong>Cooktop</strong><small>Apoia na bancada, sem furar</small></button>
          </div>
        </div>

        <div class="onb-passo">
          <h3 class="onb-passo-t"><span>2</span> Como é a sua churrasqueira?</h3>
          <div class="onb-chips" role="group" aria-label="Tipo de churrasqueira">
            ${AMBIENTES.map((a) => `<button type="button" data-amb="${a.id}" aria-pressed="${s.amb === a.id}"><strong>${a.nome}</strong><small>${a.sub}</small></button>`).join("")}
          </div>
          <p class="onb-ajuda">Só para você ver o kit no lugar. O preço não muda.</p>
        </div>

        <div class="onb-passo">
          <h3 class="onb-passo-t"><span>3</span> Medidas da boca</h3>
          <div class="onb-campos">
            ${campo("a", "Largura (A)", "De parede a parede, por dentro.", A_MIN, A_MAX, s.a)}
            ${campo("b", "Comprimento (B)", "Da boca até a parede do fundo.", B_MIN, B_MAX, s.b)}
          </div>
          <details class="onb-como">
            <summary>Como medir</summary>
            ${foto("como-medir", "Churrasqueira com a largura da boca marcada como A e o comprimento interno como B", 500, 500)}
            <p class="onb-ajuda">Depois da compra, nosso time de projeto confirma as medidas finas com você.</p>
          </details>
        </div>

        <div class="onb-passo">
          <h3 class="onb-passo-t"><span>4</span> Kit completo ou peça por peça?</h3>
          <div class="onb-modos" role="group" aria-label="Forma de montar">
            <button type="button" data-modo="kit" aria-pressed="${s.modo === "kit"}"><strong>Kit completo</strong><small>Tudo calculado pela fábrica</small></button>
            <button type="button" data-modo="pecas" aria-pressed="${s.modo === "pecas"}"><strong>Peça por peça</strong><small>Toque no 3D para adicionar</small></button>
          </div>
          <p class="onb-faixa"></p>
          <div id="onb-conteudo"></div>
        </div>

        <div class="onb-passo">
          <h3 class="onb-passo-t"><span>5</span> Acessórios</h3>
          <div class="onb-acc-lista">
            ${acc("giratorio", "kit-giratorio", "Kit espeto giratório com motor")}
            ${acc("cesto", "cesto-miudos", "Cesto de miúdos em inox")}
            ${acc("bandeja", "bandeja-coracao", "Bandeja de coração perfurada no espeto")}
          </div>
        </div>

        <div class="onb-passo onb-resumo">
          <div class="onb-total" aria-live="polite"></div>
          <p class="onb-prazo"></p>
          <button type="button" class="onb-comprar">Comprar agora</button>
          <p class="onb-erro" role="alert" hidden></p>
          <ul class="onb-garantias">
            <li>Frete calculado com o seu CEP no carrinho</li>
            <li>Pix, boleto ou cartão em até 10x</li>
            <li>15 anos de garantia</li>
          </ul>
        </div>
      </div>
    </div>
  </section>

  <section class="onb-espelho onb-escuro" aria-labelledby="onb-espelho-t">
    <figure class="onb-espelho-foto">${foto("espeto-cabo", "Cabo de espeto em inox polido refletindo a luz", 1200, 800)}</figure>
    <div class="onb-dentro onb-espelho-txt onb-sobe">
      <p class="onb-eyebrow">Inox 304 alimentício</p>
      <h2 id="onb-espelho-t">Espelhado.<br><span>Por dentro e por fora.</span></h2>
      <p>Polido até refletir. Não enferruja, não passa gosto para a carne e sai limpo com água e sabão.</p>
    </div>
  </section>

  <section class="onb-etapas onb-escuro" aria-labelledby="onb-etapas-t">
    <div class="onb-dentro">
      <h2 id="onb-etapas-t" class="onb-sobe">Sete etapas.<br><span>Nenhum atalho.</span></h2>
      <ol class="onb-etapas-lista">
        <li class="onb-sobe"><b>Corte</b><span>Chapa e tubo de inox 304 cortados na sua medida.</span></li>
        <li class="onb-sobe"><b>Dobra</b><span>Cada aba no ângulo certo para o encaixe.</span></li>
        <li class="onb-sobe"><b>Solda</b><span>Feita à mão, contínua, sem ponto de ferrugem.</span></li>
        <li class="onb-sobe"><b>Rebarba</b><span>Nenhuma aresta que corte a mão ou prenda a carne.</span></li>
        <li class="onb-sobe"><b>Polimento</b><span>Até espelhar, peça por peça.</span></li>
        <li class="onb-sobe"><b>Conferência</b><span>Medida e encaixe testados antes de sair.</span></li>
        <li class="onb-sobe"><b>Embalagem</b><span>Protegida para chegar como saiu da fábrica.</span></li>
      </ol>
      <p class="onb-local">Fabricado em Itapema, Santa Catarina.</p>
    </div>
  </section>

  <section class="onb-garantia onb-escuro" aria-labelledby="onb-garantia-t">
    <div class="onb-dentro onb-sobe">
      <p class="onb-garantia-num" aria-hidden="true">15</p>
      <h2 id="onb-garantia-t">Anos de garantia.<br><span>Por escrito.</span></h2>
      <p>Porque a gente sabe o que fabrica, e responde por cada solda e cada encaixe.</p>
    </div>
  </section>

  <section class="onb-acessorios onb-claro" aria-labelledby="onb-acc-t">
    <div class="onb-dentro">
      <h2 id="onb-acc-t" class="onb-sobe">Para quem leva<br><span>o churrasco a sério.</span></h2>
      <div class="onb-acc-grade">
        ${accCard("giratorio", "cooktop-giratorio", "Cesto de miúdos girando com motor sobre a brasa, em kit cooktop de inox", 1200, 1600, "Espeto giratório com motor.", "Liga, encaixa e esquece. Gira no ponto da brasa enquanto você cuida do resto. Vem com o cesto de miúdos.", true)}
        ${accCard("cesto", "cesto-coracao", "Cesto de miúdos aberto, cheio de corações temperados", 500, 500, "Cesto de miúdos.", "Coração e linguicinha assando por igual, sem cair na brasa.")}
        ${accCard("bandeja", "bandeja-coracao", "Bandeja perfurada de inox presa a um espeto de duas pontas", 500, 500, "Bandeja de coração.", "Chapa perfurada no espeto. Dourado por fora, suculento por dentro.")}
        <article class="onb-acc-card onb-sobe">
          ${foto("argentina-detalhe", "Grelha argentina de canaletas em inox espelhado", 500, 333)}
          <div><h3>Grelha argentina.</h3><p>Canaletas inclinadas levam a gordura para fora da brasa. Menos labareda, menos fuligem na carne.</p>
          <button type="button" class="onb-btn-sec" data-modo="pecas">Escolher no montador</button></div>
        </article>
      </div>
    </div>
  </section>

  <section class="onb-projetos onb-escuro" aria-labelledby="onb-proj-t">
    <div class="onb-dentro">
      <h2 id="onb-proj-t" class="onb-sobe">Projetos que viram<br><span>assunto no churrasco.</span></h2>
      <div class="onb-galeria">
        <figure class="onb-g1 onb-sobe">${foto("nicho-gourmet", "Kit cooktop em nicho de granito preto com painel de inox, em cozinha gourmet de madeira", 1600, 1067)}</figure>
        <figure class="onb-g2 onb-sobe">${foto("nicho-lateral", "Kit suspenso em churrasqueira de mármore com lateral de vidro", 1280, 960)}</figure>
        <figure class="onb-g3 onb-sobe">${foto("espeto-mesa", "Espeto de inox sobre bancada de madeira no showroom", 1200, 800)}</figure>
      </div>
      <h3 class="onb-videos-t">Quem já tem, mostra.</h3>
      <div class="onb-videos">
        ${VIDEOS.map(
          ([v, p, legenda]) =>
            `<figure><button type="button" class="onb-video" data-video="${VIDEOS_CLIENTE}${v}" data-poster="${VIDEOS_CLIENTE}${p}" aria-label="Assistir: ${legenda}"><img src="${VIDEOS_CLIENTE}${p}" alt="" loading="lazy" decoding="async" width="360" height="640"><span class="onb-play" aria-hidden="true"></span></button><figcaption>${legenda}</figcaption></figure>`,
        ).join("")}
      </div>
    </div>
  </section>

  <section class="onb-reviews onb-claro" aria-labelledby="onb-rev-t">
    <div class="onb-dentro">
      <h2 id="onb-rev-t" class="onb-sobe">4,7 no Google.<br><span>41 avaliações.</span></h2>
      <div class="onb-rev-grade">
        ${REVIEWS.map((r) => `<blockquote class="onb-sobe"><p>“${r.quote}”</p><cite>${r.author}</cite></blockquote>`).join("")}
      </div>
      <a class="onb-btn-link" href="${MAPS}" target="_blank" rel="noopener">Ver todas no Google Maps ›</a>
    </div>
  </section>

  <section class="onb-faq onb-claro" aria-labelledby="onb-faq-t">
    <div class="onb-dentro onb-estreito">
      <h2 id="onb-faq-t">Perguntas rápidas.</h2>
      <details><summary>Qual a diferença entre suspenso e cooktop?</summary><p>O suspenso é parafusado na parede do fundo e deixa a boca livre. O cooktop apoia na bancada, em volta do braseiro, e não precisa furar nada. Grelhas e espetos são os mesmos.</p></details>
      <details><summary>Precisa de obra para instalar?</summary><p>Não. O suspenso vai com pés e parafusos; o cooktop só encaixa.</p></details>
      <details><summary>Minha medida não é redonda. E agora?</summary><p>O kit é feito em faixas de 5 em 5 cm e arredonda para baixo, para caber com folga. A sua medida exata vai no pedido e o time de projeto confirma com você.</p></details>
      <details><summary>Já tenho suporte. Posso comprar só grelhas?</summary><p>Pode. Em "Peça por peça", desmarque o suporte e escolha só o que falta.</p></details>
      <details><summary>Como fica o frete?</summary><p>Você vê valor e prazo no carrinho, com o seu CEP, antes de pagar.</p></details>
    </div>
  </section>

  <section class="onb-final onb-escuro" aria-labelledby="onb-final-t">
    <figure class="onb-final-foto" aria-hidden="true">${foto("nicho-gourmet", "", 1600, 1067)}</figure>
    <div class="onb-dentro onb-final-txt onb-sobe">
      <h2 id="onb-final-t">Sua churrasqueira merece.</h2>
      <p>Monte o seu em 3D, na medida certa, e receba pronto para o primeiro fogo.</p>
      <div class="onb-ctas">
        <button type="button" class="onb-btn" data-ir-montador>Montar meu kit</button>
        <a class="onb-btn-link" href="${WHATS}" target="_blank" rel="noopener">Falar com a fábrica ›</a>
      </div>
    </div>
  </section>

  <dialog class="onb-modal" aria-label="Vídeo: mudando a altura da grelha">
    <div class="onb-modal-corpo">
      <button type="button" class="onb-modal-fechar" data-fechar-modal aria-label="Fechar vídeo">×</button>
      <video src="${IMG}altura-cooktop.mp4" poster="${IMG}altura-cooktop.webp" playsinline muted loop preload="none"></video>
      <p><strong>Muda de altura com a brasa acesa.</strong> Levanta a grelha e encaixa no nível de cima, sem tirar nada de dentro da churrasqueira e sem pingar gordura no chão.</p>
    </div>
  </dialog>

  <div class="onb-dock">
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
  // a fonte vem daqui: o editor da Wbuy remove <link> e o @import colado na página não carrega
  if (!document.querySelector('link[href*="family=Inter"]')) {
    const pre = document.createElement("link");
    pre.rel = "preconnect";
    pre.href = "https://fonts.gstatic.com";
    pre.crossOrigin = "anonymous";
    const fonte = document.createElement("link");
    fonte.rel = "stylesheet";
    fonte.href =
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap";
    document.head.append(pre, fonte);
  }
  iniciar(raiz);
}
