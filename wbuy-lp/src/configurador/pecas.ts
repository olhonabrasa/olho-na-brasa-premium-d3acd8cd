// Passo das peças: o que vem no kit, o modo peça por peça (cartões, linhas, réguas),
// o balão que abre ao tocar numa peça do 3D e as mudanças na montagem.
import {
  capacidade,
  conteudoKit,
  espetosPorPeca,
  faixaKit,
  grelhasPorPeca,
  grupoDaParte,
  MAX_ESPETOS,
  medidasSugeridas,
  montagemSugerida,
  normalizar,
  totalEspetos,
  totalGrelhas,
  type EspetoTipo,
  type GrelhaTipo,
  type Grupo,
} from "../builder";
import { ACESSORIOS, encaixar, MEDIDAS } from "../catalog";
import { ACC_INFO, ESPETO_INFO, GRELHA_INFO, INFO, type AccId } from "../conteudo";
import { preco } from "../wbuy";
import { brl, esc, IMG } from "../util";
import type { Ctx, Modo } from "./estado";
import { pintarRegua } from "./medidas";

const thumb = (img: string, alt = "") =>
  `<img class="onb-thumb" src="${IMG}${img}.webp" alt="${esc(alt)}" width="56" height="56" loading="lazy" decoding="async">`;

export function montarPecas(ctx: Ctx) {
  const { root, $, s } = ctx;
  const stageEl = $(".onb-stage");
  const pop = $(".onb-pop");
  const conteudo = $("#onb-conteudo");

  // ---------- balão sobre a peça tocada no 3D ----------
  function escolherNo3D(parte: string | null, x: number, y: number) {
    if (!parte) return fecharPop();
    ctx.stage?.highlight(parte);
    ctx.acoes.fecharPilulas();
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
    ctx.stage?.highlight(null);
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
      if (t === "giratorio") ctx.acoes.alternarAcessorio("giratorio", true);
      else adicionarLinha(g, t);
    } else if (acao === "suspenso") ctx.acoes.definirInstalacao("suspenso");
    else if (acao === "tirar-acc") ctx.acoes.alternarAcessorio(b.dataset.acc as AccId, false);
    fecharPop();
  });

  function rotuloPeca(g: Grupo, idx: number) {
    if (s.modo === "kit" && ctx.comp) {
      const c = ctx.comp;
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

  // ---------- lista do kit e cartões do modo peça por peça ----------
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
      const c = ctx.comp;
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

  function marcarCartao(g: Grupo | null) {
    root
      .querySelectorAll(".onb-card")
      .forEach((c) => c.classList.toggle("foco", (c as HTMLElement).dataset.cartao === g));
  }
  function irParaCartao(g: Grupo) {
    const c = root.querySelector<HTMLElement>(`[data-cartao="${g}"]`);
    if (!c) return;
    marcarCartao(g);
    c.scrollIntoView({ behavior: ctx.reduzido ? "auto" : "smooth", block: "center" });
    c.focus({ preventScroll: true });
  }

  // ---------- mudanças na montagem ----------
  function aplicar(g: Grupo | null) {
    s.m = normalizar(s.m);
    s.foco = g;
    ctx.acoes.desenhar();
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
    ctx.acoes.desenhar();
  }

  function medidaPeca(campo: string, bruto: number) {
    const caixa = root.querySelector<HTMLInputElement>(`input[data-med="${campo}"]`);
    const ops = (caixa?.dataset.ops ?? "").split(",").map(Number);
    if (!ops.length || !Number.isFinite(bruto)) return;
    definirCampo(campo, encaixar(ops, bruto));
  }

  // ---------- eventos dos cartões ----------
  let tMed = 0;
  /** `input` numa régua de peça. Devolve true se era daqui. */
  function aoInput(t: HTMLInputElement) {
    if (!t.dataset.medRange) return false;
    // régua de peça: o número acompanha na hora e encaixa na medida vendida ao parar
    const caixa = root.querySelector<HTMLInputElement>(`input[data-med="${t.dataset.medRange}"]`);
    if (caixa) caixa.value = t.value;
    pintarRegua(t);
    clearTimeout(tMed);
    const campo = t.dataset.medRange;
    tMed = window.setTimeout(() => medidaPeca(campo, Number(t.value)), 240);
    return true;
  }

  function aoChange(t: HTMLInputElement) {
    if (t.dataset.med) medidaPeca(t.dataset.med, Number(t.value));
    else if (t.dataset.campo)
      definirCampo(t.dataset.campo, t.type === "checkbox" ? t.checked : Number(t.value));
    else return false;
    return true;
  }

  function aoClique(b: HTMLButtonElement) {
    if (b.dataset.modo) {
      definirModo(b.dataset.modo as Modo);
      if (!b.closest(".onb-painel")) ctx.acoes.irMontador();
    } else if (b.dataset.modoIr) definirModo(b.dataset.modoIr as Modo);
    else if (b.dataset.qtd) {
      const d = Number(b.dataset.d);
      if (b.dataset.qtd === "descanso") alterar("descanso", d);
      else {
        const [g, i] = b.dataset.qtd.split(".") as [Grupo, string];
        const lista: { qtd: number }[] = g === "grelhas" ? s.m.grelhas : s.m.espetos;
        lista[Number(i)].qtd = Math.max(0, lista[Number(i)].qtd + d);
        aplicar(g);
      }
    } else if (b.dataset.add) adicionarLinha(b.dataset.add as Grupo, b.dataset.tipo!);
    else if (b.dataset.removerLinha) {
      const [g, i] = b.dataset.removerLinha.split(".") as [Grupo, string];
      (g === "grelhas" ? s.m.grelhas : s.m.espetos).splice(Number(i), 1);
      aplicar(g);
    } else if (b.hasAttribute("data-sugerir")) {
      s.m = montagemSugerida(s.a, s.b);
      ctx.acoes.desenhar();
    } else return false;
    return true;
  }

  return {
    escolherNo3D,
    fecharPop,
    popAberto: () => !pop.hidden,
    renderConteudo,
    alterar,
    definirModo,
    aoInput,
    aoChange,
    aoClique,
  };
}
