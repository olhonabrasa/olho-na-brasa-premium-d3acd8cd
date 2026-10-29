// LP de campanha "Monte seu kit" para rodar dentro de uma página de conteúdo
// da Wbuy (olhonabrasa.com.br/m/<slug>/). Procura <div id="onb-kit-lp"> e
// desenha tudo ali dentro. O 3D só baixa quando o montador chega perto da tela.
// Este arquivo cuida do montador; as outras dobras estão em dobras.ts e interacoes.ts.
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
  espetosPorPeca,
  faixaKit,
  grelhasPorPeca,
  grupoDaParte,
  MAX_ESPETOS,
  medidasSugeridas,
  montagemSugerida,
  normalizar,
  pecasDaMontagem,
  skuKit,
  totalEspetos,
  totalGrelhas,
  type EspetoTipo,
  type GrelhaTipo,
  type Grupo,
  type Montagem,
} from "./builder";
import { ACESSORIOS, COMBO_GIRATORIO_CESTO, COOKTOP_SKU, encaixar, MEDIDAS } from "./catalog";
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
import {
  ACC_INFO,
  AMBIENTES,
  ESPETO_INFO,
  GRELHA_INFO,
  INFO,
  PILULAS,
  type AccId,
} from "./conteudo";
import * as D from "./dobras";
import {
  abrirWhats,
  antesDepois,
  barrasFixas,
  carrosselDestaques,
  entradasSuaves,
  filmeTopo,
  modalDeVideo,
  setasCarrossel,
  videosNaHora,
} from "./interacoes";
import { medidasGeo, meio } from "./medidas";
import { ASSET_BASE, brl, esc, IMG, reduzMovimento } from "./util";

type Modo = "kit" | "pecas";
type Estado = {
  a: number;
  b: number;
  modo: Modo;
  m: Montagem;
  foco: Grupo | null;
  inst: Instalacao;
  amb: Ambiente;
  acc: Acessorios;
  medidas: boolean;
};

const thumb = (img: string, alt = "") =>
  `<img class="onb-thumb" src="${IMG}${img}.webp" alt="${esc(alt)}" width="56" height="56" loading="lazy" decoding="async">`;

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
          : "gourmet",
    acc: { giratorio: false, cesto: false, bandeja: false, defumador: false },
    medidas: true,
  };
  if (!faixaKit(s.a, s.b)) s.modo = "pecas";
  const reduced = reduzMovimento();

  root.innerHTML = [
    D.topo(),
    D.destaques(),
    D.antesDepois(),
    D.montador(s),
    D.acabamento(),
    D.garantia(),
    D.acessorios(),
    D.projetos(),
    D.videosClientes(),
    D.avaliacoes(),
    D.perguntas(),
    D.fechamento(),
    D.rodape(),
    D.modalVideo(),
  ].join("");
  root.classList.add("onb-pronto");
  const $ = <T extends Element = HTMLElement>(sel: string) => root.querySelector(sel) as T;

  // ---------- dobras ----------
  filmeTopo(root, reduced);
  const destaques = carrosselDestaques(root, reduced);
  antesDepois(root);
  setasCarrossel(root);
  modalDeVideo(root, (aberto) => destaques.pausar(aberto));
  videosNaHora(root);
  entradasSuaves(root, reduced);
  barrasFixas(root);

  const stageEl = $(".onb-stage");
  const canvas = $<HTMLCanvasElement>(".onb-stage canvas");
  const hotspots = $(".onb-hotspots");
  const pop = $(".onb-pop");
  const conteudo = $("#onb-conteudo");
  const rotA = $(".onb-rot-a");
  const rotB = $(".onb-rot-b");
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

  if (!temWebGL) stageEl.classList.add("sem-3d");
  else {
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !stage && !stageEl.dataset.carregando) carregar3D();
        stage?.setActive(e.isIntersecting);
      },
      { rootMargin: "400px 0px" },
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
          onRender: aoDesenhar,
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

  function aoDesenhar() {
    posicionarHotspots();
    posicionarRotulos();
  }

  // ---------- clique nas peças ----------
  function escolherNo3D(parte: string | null, x: number, y: number) {
    if (!parte) return fecharPop();
    stage?.highlight(parte);
    fecharPilulas();
    if (parte.startsWith("acc_"))
      return abrirPopAcessorio(parte.replace("acc_", "") as AccId, x, y);
    if (parte === "cooktop_base") {
      pop.innerHTML = `<strong>Encaixe cooktop</strong><span>Base sob medida que apoia na bancada, sem furar a parede.</span><button type="button" data-pop="suspenso">Trocar para suspenso</button>`;
      return posPop(x, y);
    }
    const g = grupoDaParte(parte);
    s.foco = g;
    if (!g) return fecharPop();
    const idx = Number(parte.split("_").pop());
    abrirPop(g, Number.isFinite(idx) ? idx : 0, x, y);
    marcarCartao(g);
  }

  function posPop(x: number, y: number) {
    const w = stageEl.clientWidth;
    pop.style.left = Math.min(Math.max(x, 130), w - 130) + "px";
    pop.style.top = Math.max(y - 12, 96) + "px";
    pop.hidden = false;
  }

  function abrirPop(g: Grupo, idx: number, x: number, y: number) {
    const fantasma = g === "suporte" && !s.m.suporte.on;
    let corpo = `<strong>${INFO[g].titulo}</strong><span>${esc(rotuloPeca(g, idx))}</span>`;
    const somar = (tipos: [string, string][]) =>
      `<div class="onb-pop-add"><small>Adicionar outro tipo</small>${tipos
        .map(
          ([t, n]) =>
            `<button type="button" data-pop="add" data-grupo="${g}" data-tipo="${t}">+ ${n}</button>`,
        )
        .join("")}</div>`;
    if (s.modo === "kit") {
      corpo += `<button type="button" data-pop="personalizar" data-grupo="${g}">Trocar ou adicionar peças</button>`;
    } else if (fantasma) {
      corpo += `<button type="button" data-pop="incluir" data-grupo="suporte">Incluir suporte</button>`;
    } else {
      corpo += `<button type="button" data-pop="editar" data-grupo="${g}">Trocar medida</button>`;
      if (g === "grelhas")
        corpo += somar([
          ["uruguaia", "Uruguaia"],
          ["argentina", "Argentina"],
        ]);
      if (g === "espetos")
        corpo += somar([
          ["espeto_duplo", "Duplo"],
          ["espeto_chata", "Barra chata"],
          ["espeto_v", "V"],
          ["giratorio", "Giratório"],
        ]);
      corpo +=
        g === "suporte"
          ? `<button type="button" data-pop="remover" data-grupo="suporte">Já tenho suporte</button>`
          : `<button type="button" data-pop="remover-peca" data-grupo="${g}" data-idx="${idx}">Tirar esta peça</button>`;
    }
    pop.innerHTML = corpo;
    posPop(x, y);
  }

  function abrirPopAcessorio(id: AccId, x: number, y: number) {
    const titulo =
      id === "giratorio" && s.acc.cesto ? "Giratório + cesto de miúdos" : ACC_INFO[id].titulo;
    pop.innerHTML = `<strong>${titulo}</strong><span>${ACC_INFO[id].texto}</span><button type="button" data-pop="tirar-acc" data-acc="${id}">Tirar do kit</button>`;
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
    const g = b.dataset.grupo as Grupo;
    const acao = b.dataset.pop;
    if (acao === "personalizar") {
      definirModo("pecas");
      requestAnimationFrame(() => irParaCartao(g));
    } else if (acao === "editar") irParaCartao(g);
    else if (acao === "incluir") alterar("suporte", +1);
    else if (acao === "remover") alterar("suporte", -1);
    else if (acao === "remover-peca") removerPeca(g, Number(b.dataset.idx));
    else if (acao === "add") {
      const t = b.dataset.tipo!;
      if (t === "giratorio") alternarAcessorio("giratorio", true);
      else adicionarLinha(g, t);
    } else if (acao === "suspenso") definirInstalacao("suspenso");
    else if (acao === "tirar-acc") alternarAcessorio(b.dataset.acc as AccId, false);
    fecharPop();
  });

  function rotuloPeca(g: Grupo, idx: number) {
    if (s.modo === "kit" && compAtual) {
      const c = compAtual;
      if (g === "suporte") return `${c.suporteLarguraCm} cm · 3 níveis`;
      if (g === "grelhas") return `Uruguaia ${c.uruguaia.larguraCm}×${c.uruguaia.comprimentoCm} cm`;
      if (g === "descanso") return c.descanso ? `${c.descanso.larguraCm} cm` : "";
      return `Duplo ${c.espetos.comprimentoCm} cm`;
    }
    const m = s.m;
    if (g === "suporte")
      return m.suporte.on ? `${m.suporte.larguraCm} cm · 3 níveis` : "Ainda não incluído";
    if (g === "grelhas") {
      const p = grelhasPorPeca(m)[idx] ?? m.grelhas[0];
      return `${GRELHA_INFO[p.tipo].nome} ${p.larguraCm}×${p.comprimentoCm} cm`;
    }
    if (g === "descanso") return `${m.descanso.larguraCm} cm`;
    const e = espetosPorPeca(m)[idx] ?? m.espetos[0];
    return `${ESPETO_INFO[e.tipo].nome} ${e.comprimentoCm} cm`;
  }

  // ---------- pílulas (estilo "Design" da Apple) ----------
  const pilulas = [...root.querySelectorAll<HTMLButtonElement>("[data-pilula]")];
  function fecharPilulas() {
    pilulas.forEach((p) => p.setAttribute("aria-expanded", "false"));
  }
  pilulas.forEach((p) =>
    p.addEventListener("click", () => {
      const aberta = p.getAttribute("aria-expanded") === "true";
      fecharPilulas();
      fecharPop();
      const info = PILULAS.find((x) => x.id === p.dataset.pilula)!;
      if (aberta) return stage?.highlight(null);
      p.setAttribute("aria-expanded", "true");
      if (info.id === "medidas") {
        s.medidas = true;
        desenhar();
      } else stage?.highlight(info.partes);
    }),
  );

  // ---------- etiquetas A e B sobre as setas ----------
  function geoMedidas() {
    const c = compAtual;
    if (!c) return null;
    return medidasGeo({
      a: s.a / 100,
      b: s.b / 100,
      instalacao: s.inst,
      peM: c.peCm / 100,
      suporteM: c.suporteLarguraCm / 100,
    });
  }
  function posicionarRotulos() {
    const geo = s.medidas && stage ? geoMedidas() : null;
    rotA.hidden = rotB.hidden = !geo;
    if (!geo || !stage) return;
    const pa = stage.project(meio(geo.a));
    const pb = stage.project(meio(geo.b));
    rotA.style.transform = `translate(${pa.x}px, ${pa.y}px)`;
    rotB.style.transform = `translate(${pb.x}px, ${pb.y}px)`;
    rotA.querySelector("em")!.textContent = `${s.a} cm`;
    rotB.querySelector("em")!.textContent = `${s.b} cm`;
  }

  // ---------- pontos de "+" sobre o canvas ----------
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
      const c = compAtual;
      const fantasma = s.modo === "pecas" && !s.m.suporte.on ? ["suporte"] : [];
      stage?.update(c, {
        fantasma,
        instalacao: s.inst,
        ambiente: s.amb,
        grelhas: s.modo === "pecas" ? grelhasPorPeca(s.m) : undefined,
        espetos:
          s.modo === "pecas"
            ? espetosPorPeca(s.m)
            : Array.from({ length: c.espetos.quantidade }, () => ({
                tipo: "espeto_duplo" as const,
                comprimentoCm: c.espetos.comprimentoCm,
              })),
        acessorios: s.acc,
        boca: { a: s.a, b: s.b },
        medidas: s.medidas,
      });
      $(".onb-fallback").innerHTML = desenhoFrente(c, fantasma.length > 0);
      canvas.setAttribute("aria-label", descreverParaLeitor());
    }
    montarHotspots();
    posicionarRotulos();
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

  /** Caixa em cm + régua, como na página de produto da loja. Encaixa na medida vendida. */
  const medida = (campo: string, rotulo: string, opcoes: number[], valor: number) => {
    const ord = [...opcoes].sort((x, y) => x - y);
    const min = ord[0];
    const max = ord[ord.length - 1];
    const p = ((valor - min) / (max - min || 1)) * 100;
    return `<div class="onb-med">
      <span class="onb-med-rot">${rotulo}</span>
      <span class="onb-calc-num pequeno"><input type="number" inputmode="numeric" data-med="${campo}" data-ops="${ord.join(",")}" min="${min}" max="${max}" value="${valor}" aria-label="${rotulo}"><em>cm</em></span>
      <input type="range" class="onb-calc-range" data-med-range="${campo}" min="${min}" max="${max}" step="1" value="${valor}" style="--p:${p}%" aria-label="${rotulo}">
    </div>`;
  };

  function renderConteudo() {
    const f = faixaKit(s.a, s.b);
    root.querySelectorAll<HTMLButtonElement>(".onb-painel [data-modo]").forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset.modo === s.modo));
      if (b.dataset.modo === "kit") b.disabled = !f;
    });
    $(".onb-faixa").innerHTML = f
      ? `Kit da faixa <strong>${f.a}×${f.b} cm</strong>, para a sua boca de ${s.a}×${s.b} cm.`
      : `Sua medida está fora das faixas do kit completo (50–99 × 40–74 cm). Monte peça por peça ou <button type="button" class="onb-link-inline" data-whats>fale com a fábrica</button>.`;

    if (s.modo === "kit") {
      const c = compAtual;
      const imgs = [
        "peca-suporte",
        "peca-uruguaia",
        "peca-descanso",
        "peca-duplo",
        s.inst === "cooktop" ? "cooktop-produto" : "peca-suporte",
      ];
      conteudo.innerHTML = c
        ? `<ul class="onb-lista">${conteudoKit(c, s.inst === "cooktop")
            .map((l, i) => `<li>${thumb(imgs[i] ?? "peca-suporte")}<span>${l}</span></li>`)
            .join("")}</ul>
          <button type="button" class="onb-link" data-modo-ir="pecas">Quer trocar, misturar ou tirar alguma peça? Monte peça por peça →</button>`
        : "";
      return;
    }
    const m = s.m;
    const cap = capacidade(m);
    const ng = totalGrelhas(m);
    const ne = totalEspetos(m);
    const stepper = (campo: string, q: number, cheio: boolean) =>
      `<div class="onb-stepper" role="group" aria-label="Quantidade">
        <button type="button" data-qtd="${campo}" data-d="-1" aria-label="Menos" ${q <= 0 ? "disabled" : ""}>−</button>
        <output aria-live="polite">${q}</output>
        <button type="button" data-qtd="${campo}" data-d="1" aria-label="Mais" ${cheio ? "disabled" : ""}>+</button>
      </div>`;
    const cartao = (g: Grupo, corpo: string, ativo: boolean) =>
      `<article class="onb-card${ativo ? "" : " vazio"}${s.foco === g ? " foco" : ""}" data-cartao="${g}" tabindex="-1">
        <header>${thumb(INFO[g].img, INFO[g].titulo)}<div><h4>${INFO[g].titulo}</h4><p class="onb-sub">${INFO[g].sub}</p></div><p class="onb-preco-peca" data-preco-grupo="${g}"></p></header>
        ${corpo}</article>`;
    const adicionar = (g: Grupo, tipos: [string, string][], cheio: boolean) =>
      `<div class="onb-add-tipo"><span>Adicionar</span>${tipos
        .map(
          ([t, n]) =>
            `<button type="button" data-add="${g}" data-tipo="${t}" ${cheio ? "disabled" : ""}>+ ${n}</button>`,
        )
        .join("")}</div>`;
    const remover = (campo: string, n: number) =>
      n > 1
        ? `<button type="button" class="onb-linha-x" data-remover-linha="${campo}" aria-label="Tirar esta linha">×</button>`
        : "";

    const linhasGrelha = m.grelhas
      .map(
        (g, i) => `<div class="onb-linha">
          ${thumb(GRELHA_INFO[g.tipo].img, GRELHA_INFO[g.tipo].nome)}
          <div class="onb-linha-corpo">
            <p class="onb-linha-t"><b>${GRELHA_INFO[g.tipo].nome}</b> <small>${GRELHA_INFO[g.tipo].nota}</small></p>
            <div class="onb-linha-med">
              ${medida(`grelhas.${i}.larguraCm`, "Largura", MEDIDAS.uruguaiaLargura, g.larguraCm)}
              ${medida(`grelhas.${i}.comprimentoCm`, "Comprimento", MEDIDAS.uruguaiaComprimento, g.comprimentoCm)}
            </div>
          </div>
          <div class="onb-linha-fim"><div class="onb-linha-acoes">${stepper(`grelhas.${i}`, g.qtd, ng >= cap.grelhas)}${remover(`grelhas.${i}`, m.grelhas.length)}</div><span class="onb-preco-linha" data-preco-linha="grelhas.${i}"></span></div>
        </div>`,
      )
      .join("");
    const linhasEspeto = m.espetos
      .map(
        (e, i) => `<div class="onb-linha">
          ${thumb(ESPETO_INFO[e.tipo].img, ESPETO_INFO[e.tipo].nome)}
          <div class="onb-linha-corpo">
            <p class="onb-linha-t"><b>${ESPETO_INFO[e.tipo].nome}</b> <small>${ESPETO_INFO[e.tipo].nota}</small></p>
            <div class="onb-linha-med">${medida(`espetos.${i}.comprimentoCm`, "Comprimento", MEDIDAS.espeto, e.comprimentoCm)}</div>
          </div>
          <div class="onb-linha-fim"><div class="onb-linha-acoes">${stepper(`espetos.${i}`, e.qtd, ne >= MAX_ESPETOS)}${remover(`espetos.${i}`, m.espetos.length)}</div><span class="onb-preco-linha" data-preco-linha="espetos.${i}"></span></div>
        </div>`,
      )
      .join("");

    conteudo.innerHTML = [
      cartao(
        "suporte",
        `<div class="onb-row">
          ${medida("suporte.larguraCm", "Largura", MEDIDAS.suporte, m.suporte.larguraCm)}
          <label class="onb-switch"><input type="checkbox" data-campo="suporte.on" ${m.suporte.on ? "checked" : ""}> Incluir</label>
        </div>`,
        m.suporte.on,
      ),
      cartao(
        "grelhas",
        `${linhasGrelha}
        ${adicionar(
          "grelhas",
          [
            ["uruguaia", "Uruguaia"],
            ["argentina", "Argentina"],
          ],
          ng >= cap.grelhas,
        )}
        <p class="onb-cap">${ng} de ${cap.grelhas} lugares usados neste suporte.</p>`,
        ng > 0,
      ),
      cartao(
        "descanso",
        `<div class="onb-row">
          ${medida("descanso.larguraCm", "Largura", MEDIDAS.descanso, m.descanso.larguraCm)}
          ${stepper("descanso", m.descanso.qtd, m.descanso.qtd >= cap.descanso)}
        </div>${cap.descanso === 0 ? `<p class="onb-cap">O nível de cima está ocupado por grelhas.</p>` : ""}`,
        m.descanso.qtd > 0,
      ),
      cartao(
        "espetos",
        `${linhasEspeto}
        <div class="onb-linha onb-linha-gir${s.acc.giratorio ? " on" : ""}">
          ${thumb("peca-giratorio", "Kit espeto giratório")}
          <div class="onb-linha-corpo"><p class="onb-linha-t"><b>Giratório com motor</b> <small>Gira sozinho · 4 pilhas AA</small> <span class="onb-acc-preco" data-preco-acc="giratorio"></span></p></div>
          <label class="onb-switch"><input type="checkbox" data-acc-check="giratorio" ${s.acc.giratorio ? "checked" : ""}> Incluir</label>
        </div>
        ${adicionar(
          "espetos",
          [
            ["espeto_duplo", "Duplo"],
            ["espeto_chata", "Barra chata"],
            ["espeto_v", "V"],
          ],
          ne >= MAX_ESPETOS,
        )}`,
        ne > 0 || s.acc.giratorio,
      ),
      `<button type="button" class="onb-link" data-sugerir>Voltar às peças sugeridas para ${s.a}×${s.b} cm</button>`,
    ].join("");
    // o preço do giratório dentro do cartão de espetos vem do cache de acessórios
    preco(ACESSORIOS.giratorio.sku).then((p) => {
      if (p)
        conteudo
          .querySelectorAll('[data-preco-acc="giratorio"]')
          .forEach((el) => (el.textContent = brl(p.valor)));
    });
  }

  function renderAcessorios() {
    const combo = s.acc.giratorio && s.acc.cesto;
    root.querySelectorAll<HTMLButtonElement>("[data-acc-toggle]").forEach((b) => {
      const id = b.dataset.accToggle as AccId;
      const on = s.acc[id];
      b.setAttribute("aria-pressed", String(on));
      const rot = b.querySelector(".onb-acc-acao");
      if (rot)
        rot.textContent = on
          ? "No seu kit ✓"
          : b.classList.contains("onb-acc")
            ? "Adicionar"
            : "Adicionar ao kit";
    });
    root.querySelectorAll<HTMLButtonElement>("[data-combo]").forEach((b) => {
      b.setAttribute("aria-pressed", String(combo));
      b.querySelector(".onb-acc-acao")!.textContent = combo
        ? "Combo no seu kit ✓"
        : "Adicionar o combo";
    });
    const nota = $(".onb-combo-nota");
    nota.hidden = !combo;
    if (combo) atualizarNotaCombo();
  }

  async function atualizarNotaCombo() {
    const [g, c, k] = await Promise.all([
      preco(ACESSORIOS.giratorio.sku),
      preco(ACESSORIOS.cesto.sku),
      preco(COMBO_GIRATORIO_CESTO),
    ]);
    if (!g || !c || !k) return;
    const economia = g.valor + c.valor - k.valor;
    $(".onb-combo-nota").innerHTML =
      economia > 0
        ? `Giratório + cesto entram como combo: <b>${brl(k.valor)}</b>, ${brl(economia)} a menos que separados.`
        : `Giratório + cesto entram como combo: <b>${brl(k.valor)}</b>.`;
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
  }

  // ---------- mudanças no modelo ----------
  function aplicar(g: Grupo | null) {
    s.m = normalizar(s.m);
    s.foco = g;
    desenhar();
    if (g) marcarCartao(g);
  }

  /** "+" no 3D: soma na primeira linha do grupo. */
  function alterar(g: Grupo, d: number) {
    if (s.modo !== "pecas") definirModo("pecas");
    const m = s.m;
    if (g === "suporte") m.suporte.on = d > 0;
    else if (g === "descanso") m.descanso.qtd = Math.max(0, m.descanso.qtd + d);
    else if (g === "grelhas") m.grelhas[0].qtd = Math.max(0, m.grelhas[0].qtd + d);
    else m.espetos[0].qtd = Math.max(0, m.espetos[0].qtd + d);
    aplicar(g);
  }

  function adicionarLinha(g: Grupo, tipo: string) {
    if (s.modo !== "pecas") definirModo("pecas");
    const md = medidasSugeridas(s.a, s.b);
    if (g === "grelhas") {
      if (totalGrelhas(s.m) >= capacidade(s.m).grelhas) return;
      const ref = s.m.grelhas[0] ?? {
        larguraCm: md.grelhaLargura,
        comprimentoCm: md.grelhaComprimento,
      };
      const vazia = s.m.grelhas.find((x) => x.qtd === 0);
      if (vazia) Object.assign(vazia, { tipo: tipo as GrelhaTipo, qtd: 1 });
      else
        s.m.grelhas.push({
          tipo: tipo as GrelhaTipo,
          larguraCm: ref.larguraCm,
          comprimentoCm: ref.comprimentoCm,
          qtd: 1,
        });
    } else if (g === "espetos") {
      if (totalEspetos(s.m) >= MAX_ESPETOS) return;
      const ref = s.m.espetos[0] ?? { comprimentoCm: md.espeto };
      const vazia = s.m.espetos.find((x) => x.qtd === 0);
      if (vazia) Object.assign(vazia, { tipo: tipo as EspetoTipo, qtd: 1 });
      else s.m.espetos.push({ tipo: tipo as EspetoTipo, comprimentoCm: ref.comprimentoCm, qtd: 1 });
    }
    aplicar(g);
  }

  /** Tira a peça clicada no 3D (a n-ésima grelha ou espeto). */
  function removerPeca(g: Grupo, idx: number) {
    const lista = g === "grelhas" ? s.m.grelhas : g === "espetos" ? s.m.espetos : null;
    if (!lista) return alterar(g, -1);
    let n = idx;
    for (const l of lista) {
      if (n < l.qtd) {
        l.qtd -= 1;
        break;
      }
      n -= l.qtd;
    }
    aplicar(g);
  }

  function definirCampo(caminho: string, valor: unknown) {
    const partes = caminho.split(".");
    let alvo = s.m as unknown as Record<string, unknown>;
    for (const p of partes.slice(0, -1)) alvo = alvo[p] as Record<string, unknown>;
    alvo[partes[partes.length - 1]] = valor;
    aplicar(partes[0] as Grupo);
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
    if (inst === "suspenso" && s.amb === "bancada") s.amb = "gourmet";
    desenhar();
  }

  function alternarAcessorio(id: AccId, on?: boolean) {
    s.acc[id] = on ?? !s.acc[id];
    desenhar();
  }

  // ---------- carrinho e preço ----------
  type Item = ItemCarrinho & { chave: string | null };
  function itensCarrinho(): Item[] {
    const f = faixaKit(s.a, s.b);
    const nota = `Medida da churrasqueira: ${s.a}x${s.b} cm · ${s.inst} · ${s.amb} (LP Monte seu kit)`;
    const base: Item[] = [];
    if (s.modo === "kit") {
      if (f) base.push({ sku: skuKit(f.a, f.b)!, qtd: 1, anotacao: nota, chave: null });
    } else {
      // cada linha leva a sua chave para o preço aparecer ao lado dela no cartão
      const pos: Record<string, number> = { grelhas: 0, espetos: 0 };
      pecasDaMontagem(s.m).forEach((i, k) => {
        let chave: string = i.grupo;
        if (i.grupo === "grelhas" || i.grupo === "espetos") {
          const lista: { qtd: number }[] = i.grupo === "grelhas" ? s.m.grelhas : s.m.espetos;
          let p = pos[i.grupo];
          while (p < lista.length && lista[p].qtd === 0) p++;
          pos[i.grupo] = p + 1;
          chave = `${i.grupo}.${p}`;
        }
        base.push({ sku: i.sku, qtd: i.peca.qtd, anotacao: k === 0 ? nota : "", chave });
      });
    }
    if (s.inst === "cooktop" && comSuporte()) base.push({ sku: COOKTOP_SKU, qtd: 1, chave: null });
    const combo = s.acc.giratorio && s.acc.cesto;
    if (combo) base.push({ sku: COMBO_GIRATORIO_CESTO, qtd: 1, chave: null });
    (Object.keys(s.acc) as AccId[]).forEach((id) => {
      if (!s.acc[id] || (combo && (id === "giratorio" || id === "cesto"))) return;
      base.push({ sku: ACESSORIOS[id].sku, qtd: 1, chave: null });
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
    const porGrupo: Record<string, number> = {};
    precos.forEach((p, i) => {
      const v = p!.valor * itens[i].qtd;
      total += v;
      pix += (p!.pix ?? p!.valor) * itens[i].qtd;
      const chave = itens[i].chave;
      if (!chave) return;
      const grupo = chave.split(".")[0];
      porGrupo[grupo] = (porGrupo[grupo] ?? 0) + v;
      const el = root.querySelector(`[data-preco-linha="${chave}"]`);
      if (el) el.textContent = brl(v);
    });
    Object.entries(porGrupo).forEach(([gr, v]) => {
      const el = root.querySelector(`[data-preco-grupo="${gr}"]`);
      if (el) el.textContent = brl(v);
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

  // preço de cada acessório e do combo nos cartões (uma consulta cada, guardada na visita)
  (Object.keys(ACESSORIOS) as AccId[]).forEach((id) =>
    preco(ACESSORIOS[id].sku).then((p) => {
      if (!p) return;
      root
        .querySelectorAll(`[data-preco-acc="${id}"]`)
        .forEach((el) => (el.textContent = brl(p.valor)));
    }),
  );
  preco(COMBO_GIRATORIO_CESTO).then((p) => {
    if (p)
      root.querySelectorAll("[data-preco-combo]").forEach((el) => (el.textContent = brl(p.valor)));
  });

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
      erro.innerHTML = `${esc((e as Error).message)} <button type="button" class="onb-link-inline" data-whats>Falar com a fábrica</button>`;
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
  function pintarRegua(r: HTMLInputElement) {
    const min = Number(r.min);
    const max = Number(r.max);
    r.style.setProperty("--p", `${((Number(r.value) - min) / (max - min || 1)) * 100}%`);
  }
  root.querySelectorAll<HTMLInputElement>(".onb-calc-range[data-par]").forEach(pintarRegua);

  function lerMedida(nome: "a" | "b", bruto: number, final: boolean) {
    const [min, max] = nome === "a" ? [A_MIN, A_MAX] : [B_MIN, B_MAX];
    const inp = root.querySelector<HTMLInputElement>(`input[name="${nome}"]`)!;
    const range = root.querySelector<HTMLInputElement>(`input[name="${nome}-range"]`)!;
    const v = Math.round(bruto);
    const ok = Number.isFinite(v) && v >= min && v <= max;
    inp.setAttribute("aria-invalid", String(!ok));
    $(`#onb-msg-${nome}`).textContent = ok ? "" : `Entre ${min} e ${max} cm`;
    if (!ok) return;
    if (document.activeElement !== inp) inp.value = String(v);
    range.value = String(v);
    pintarRegua(range);
    if (!final) return;
    if (nome === "a") s.a = v;
    else s.b = v;
    s.m = montagemSugerida(s.a, s.b);
    if (s.modo === "kit" && !faixaKit(s.a, s.b)) s.modo = "pecas";
    desenhar();
  }

  function medidaPeca(campo: string, bruto: number) {
    const caixa = root.querySelector<HTMLInputElement>(`input[data-med="${campo}"]`);
    const ops = (caixa?.dataset.ops ?? "").split(",").map(Number);
    if (!ops.length || !Number.isFinite(bruto)) return;
    definirCampo(campo, encaixar(ops, bruto));
  }

  let tMedida = 0;
  let tMed = 0;
  root.addEventListener("input", (e) => {
    const t = e.target as HTMLInputElement;
    if (t.name === "a" || t.name === "b") {
      clearTimeout(tMedida);
      tMedida = window.setTimeout(() => lerMedida(t.name as "a" | "b", Number(t.value), true), 450);
    } else if (t.dataset.par) {
      const nome = t.dataset.par as "a" | "b";
      lerMedida(nome, Number(t.value), false);
      clearTimeout(tMedida);
      tMedida = window.setTimeout(() => lerMedida(nome, Number(t.value), true), 180);
    } else if (t.dataset.medRange) {
      // régua de peça: o número acompanha na hora e encaixa na medida vendida ao parar
      const caixa = root.querySelector<HTMLInputElement>(`input[data-med="${t.dataset.medRange}"]`);
      if (caixa) caixa.value = t.value;
      pintarRegua(t);
      clearTimeout(tMed);
      const campo = t.dataset.medRange;
      tMed = window.setTimeout(() => medidaPeca(campo, Number(t.value)), 240);
    }
  });
  root.addEventListener("change", (e) => {
    const t = e.target as HTMLInputElement;
    if (t.name === "a" || t.name === "b") return lerMedida(t.name, Number(t.value), true);
    if (t.dataset.med) return medidaPeca(t.dataset.med, Number(t.value));
    if (t.dataset.accCheck) return alternarAcessorio(t.dataset.accCheck as AccId, t.checked);
    if (t.dataset.campo)
      definirCampo(t.dataset.campo, t.type === "checkbox" ? t.checked : Number(t.value));
  });

  root.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>("button");
    if (!b || b.disabled) return;
    if (b.hasAttribute("data-whats"))
      return abrirWhats(`Quero o kit ${s.inst} para ${s.a}x${s.b} cm`);
    if (b.dataset.modo) {
      definirModo(b.dataset.modo as Modo);
      if (!b.closest(".onb-painel")) irMontador();
    } else if (b.dataset.modoIr) definirModo(b.dataset.modoIr as Modo);
    else if (b.dataset.inst) definirInstalacao(b.dataset.inst as Instalacao);
    else if (b.dataset.amb) {
      s.amb = b.dataset.amb as Ambiente;
      desenhar();
    } else if (b.dataset.accToggle) alternarAcessorio(b.dataset.accToggle as AccId);
    else if (b.hasAttribute("data-combo")) {
      const on = !(s.acc.giratorio && s.acc.cesto);
      s.acc.giratorio = on;
      s.acc.cesto = on;
      desenhar();
    } else if (b.dataset.qtd) {
      const d = Number(b.dataset.d);
      if (b.dataset.qtd === "descanso") return alterar("descanso", d);
      const [g, i] = b.dataset.qtd.split(".") as [Grupo, string];
      const lista: { qtd: number }[] = g === "grelhas" ? s.m.grelhas : s.m.espetos;
      lista[Number(i)].qtd = Math.max(0, lista[Number(i)].qtd + d);
      aplicar(g);
    } else if (b.dataset.add) adicionarLinha(b.dataset.add as Grupo, b.dataset.tipo!);
    else if (b.dataset.removerLinha) {
      const [g, i] = b.dataset.removerLinha.split(".") as [Grupo, string];
      (g === "grelhas" ? s.m.grelhas : s.m.espetos).splice(Number(i), 1);
      aplicar(g);
    } else if (b.hasAttribute("data-sugerir")) {
      s.m = montagemSugerida(s.a, s.b);
      desenhar();
    } else if (b.classList.contains("onb-comprar")) comprar(b);
    else if (b.hasAttribute("data-ir-montador")) irMontador();
    else if (b.hasAttribute("data-reset")) stage?.resetView();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!pop.hidden) fecharPop();
    fecharPilulas();
  });

  if (MODO_SIMULADO)
    root.insertAdjacentHTML(
      "afterbegin",
      `<p class="onb-simulado">Modo simulado (fora da loja): preços de exemplo, carrinho não é alterado.</p>`,
    );
  desenhar();
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
  // marca a página para o CSS esconder o topo, as faixas e o rodapé da loja
  document.documentElement.classList.add("onb-lp-ativa");
  iniciar(raiz);
}
