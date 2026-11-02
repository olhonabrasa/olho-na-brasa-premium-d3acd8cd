// Passo das peças. No Kit Premium: as seis linhas (a lida acende a peça no 3D). No "Montar o meu":
// todas as peças com foto, medida e preço, Adicionar/Remover. Nos dois, o balão ao tocar no 3D.
import {
  capacidade,
  composicaoKit,
  faixaKit,
  grupoDaParte,
  linhasKit,
  MAX_ESPETOS,
  medidasSugeridas,
  normalizar,
  totalEspetos,
  totalGrelhas,
  type EspetoTipo,
  type GrelhaTipo,
  type Grupo,
} from "../builder";
import { ACESSORIOS, encaixar, MEDIDAS, skuPeca } from "../catalog";
import { ACC_INFO, ESPETO_INFO, GRELHA_INFO, INFO, type AccId } from "../conteudo";
import { preco } from "../wbuy";
import { brl, esc, foto } from "../util";
import type { Ctx } from "./estado";
import { pintarRegua } from "./medidas";

const GRELHAS: GrelhaTipo[] = ["uruguaia", "argentina"];
const ESPETOS: EspetoTipo[] = ["espeto_duplo", "espeto_chata", "espeto_v"];
const ACCS: AccId[] = ["giratorio", "cesto", "bandeja", "defumador"];

export function montarPecas(ctx: Ctx) {
  const { $, s } = ctx;
  const stageEl = $(".onb-stage");
  const pop = $(".onb-pop");
  const conteudo = $("#onb-conteudo");
  const faixa = ctx.root.querySelector<HTMLElement>(".onb-faixa");
  const livre = ctx.cena.modo === "pecas";

  // ---------- balão sobre a peça tocada no 3D ----------
  function escolherNo3D(parte: string | null, x: number, y: number) {
    if (!parte) return fecharPop();
    ctx.stage?.highlight(parte);
    if (parte.startsWith("acc_")) {
      const id = parte.replace("acc_", "") as AccId;
      const titulo =
        id === "giratorio" && s.acc.cesto ? "Giratório + cesto de miúdos" : ACC_INFO[id].titulo;
      pop.innerHTML = `<strong>${titulo}</strong><span>${ACC_INFO[id].texto}</span><button type="button" data-pop="tirar-acc" data-acc="${id}">Tirar do kit</button>`;
      return posPop(x, y);
    }
    if (parte === "cooktop_base") {
      pop.innerHTML = `<strong>Encaixe cooktop</strong><span>Base sob medida que apoia na bancada, sem furar a parede.</span><button type="button" data-pop="suspenso">Trocar para suspenso</button>`;
      return posPop(x, y);
    }
    const g = grupoDaParte(parte);
    if (!g) return fecharPop();
    const idx = Number(parte.split("_").pop());
    pop.innerHTML = `<strong>${INFO[g].titulo}</strong><span>${esc(rotuloPeca(g, Number.isFinite(idx) ? idx : 0))}</span>`;
    posPop(x, y);
  }

  function posPop(x: number, y: number) {
    const w = stageEl.clientWidth;
    pop.style.left = Math.min(Math.max(x, 130), w - 130) + "px";
    pop.style.top = Math.max(y - 12, 96) + "px";
    pop.hidden = false;
  }

  function fecharPop() {
    pop.hidden = true;
    ctx.stage?.highlight(null);
  }

  /** Clique num botão do balão (delegado pelo KitConfigurador). */
  function aoPop(b: HTMLButtonElement) {
    if (b.dataset.pop === "tirar-acc") ctx.acoes.alternarAcessorio(b.dataset.acc as AccId, false);
    else if (b.dataset.pop === "suspenso") ctx.acoes.definirInstalacao("suspenso");
    fecharPop();
  }

  function rotuloPeca(g: Grupo, idx: number) {
    const c = ctx.comp;
    if (!c) return "";
    if (g === "suporte") return `${c.suporteLarguraCm} cm · 3 níveis`;
    if (g === "grelhas") return `Uruguaia ${c.uruguaia.larguraCm}×${c.uruguaia.comprimentoCm} cm`;
    if (g === "descanso") return c.descanso ? `${c.descanso.larguraCm} cm` : "";
    return `${idx === 1 ? "Simples" : "Duplo"} ${c.espetos.comprimentoCm} cm`;
  }

  // ---------- Kit Premium: a linha que cruza o meio da tela acende a peça no 3D ----------
  const centro = new IntersectionObserver(
    (es) => es.some((e) => e.isIntersecting) && acenderPerto(),
    { rootMargin: "-45% 0px -45% 0px" },
  );
  const linhas = () => [...conteudo.querySelectorAll<HTMLElement>("li[data-peca]")];

  /** Acende a linha mais perto do meio da tela (pelo observer e quando o passo do kit vira o ativo). */
  function acenderPerto() {
    const meio = innerHeight / 2;
    const perto = linhas()
      .map((li) => {
        const r = li.getBoundingClientRect();
        return { li, d: Math.abs(r.top + r.height / 2 - meio) };
      })
      .sort((a, b) => a.d - b.d)[0];
    if (perto) acenderLinha(perto.li);
  }

  function acenderLinha(li: HTMLElement) {
    // só enquanto o passo do kit é o ativo (o cartão que cruza o meio da tela)
    if (!li.closest(".onb-passo")?.classList.contains("ativo")) return;
    linhas().forEach((x) => {
      x.classList.toggle("acesa", x === li);
      x.classList.toggle("esmaecida", x !== li);
    });
    // os pés estão soldados no suporte: acendem com ele
    ctx.stage?.focar(li.dataset.peca === "pes" ? "suporte" : li.dataset.peca!);
  }

  /** Ao sair do passo do kit, tudo volta a 1. */
  function apagarLinhas() {
    linhas().forEach((x) => x.classList.remove("acesa", "esmaecida"));
    ctx.stage?.focar(null);
  }

  function renderKit() {
    const f = faixaKit(s.a, s.b);
    const c = f ? composicaoKit(s.a, s.b) : null;
    if (faixa) {
      faixa.hidden = !!f && f.a === s.a && f.b === s.b;
      faixa.innerHTML = f
        ? `Kit da faixa <strong>${f.a}×${f.b} cm</strong>, para a sua boca de ${s.a}×${s.b} cm.`
        : `Sua medida está fora das faixas do kit (50–99 × 40–74 cm). <button type="button" class="onb-link-inline" data-whats>Fale com a fábrica</button>: a gente faz sob medida.`;
    }
    conteudo.innerHTML = c
      ? linhasKit(c)
          .map(
            (l) =>
              `<li data-peca="${l.peca}"><span class="onb-kit-nome">${l.nome}</span><span class="onb-kit-medida">${l.medida}</span></li>`,
          )
          .join("")
      : "";
    linhas().forEach((li) => centro.observe(li));
  }

  // ---------- Montar o meu: todas as peças, cada uma com medida, preço e quantidade ----------
  /** Garante uma linha por tipo (com a medida sugerida), para as réguas existirem antes de adicionar. */
  function garantirLinhas() {
    const md = medidasSugeridas(s.a, s.b);
    for (const tipo of GRELHAS)
      if (!s.m.grelhas.some((g) => g.tipo === tipo))
        s.m.grelhas.push({
          tipo,
          larguraCm: md.grelhaLargura,
          comprimentoCm: md.grelhaComprimento,
          qtd: 0,
        });
    for (const tipo of ESPETOS)
      if (!s.m.espetos.some((e) => e.tipo === tipo))
        s.m.espetos.push({ tipo, comprimentoCm: md.espeto, qtd: 0 });
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
  const stepper = (chave: string, q: number, cheio: boolean) =>
    `<div class="onb-stepper" role="group" aria-label="Quantidade">
      <button type="button" data-qtd="${chave}" data-d="-1" aria-label="Menos" ${q <= 0 ? "disabled" : ""}>−</button>
      <output aria-live="polite">${q}</output>
      <button type="button" data-qtd="${chave}" data-d="1" aria-label="Mais" ${cheio ? "disabled" : ""}>+</button>
    </div>`;
  const cartao = (
    chave: string,
    img: string,
    nome: string,
    nota: string,
    medidas: string,
    controle: string,
    no: boolean,
  ) => `<article class="onb-acc onb-peca${no ? " no-kit" : ""}" data-peca-linha="${chave}">
      ${foto(img, nome, 500, 500)}
      <div class="onb-acc-txt"><strong>${nome}</strong><small>${nota}</small>${medidas}<span class="onb-acc-preco" data-preco-peca="${chave}"></span></div>
      ${controle}
    </article>`;

  function renderLivre() {
    garantirLinhas();
    const m = s.m;
    const cap = capacidade(m);
    const ng = totalGrelhas(m);
    const ne = totalEspetos(m);
    const partes: string[] = [];
    partes.push(
      cartao(
        "suporte",
        INFO.suporte.img,
        INFO.suporte.titulo,
        INFO.suporte.sub,
        medida("suporte.larguraCm", "Largura", MEDIDAS.suporte, m.suporte.larguraCm),
        `<button type="button" class="onb-acc-btn" data-peca-toggle="suporte" aria-pressed="${m.suporte.on}"><span class="onb-acc-acao">${m.suporte.on ? "No kit" : "Adicionar"}</span></button>`,
        m.suporte.on,
      ),
    );
    m.grelhas.forEach((g, i) =>
      partes.push(
        cartao(
          g.tipo,
          GRELHA_INFO[g.tipo].img,
          `Grelha ${GRELHA_INFO[g.tipo].nome.toLowerCase()}`,
          GRELHA_INFO[g.tipo].nota,
          medida(`grelhas.${i}.larguraCm`, "Largura", MEDIDAS.uruguaiaLargura, g.larguraCm) +
            medida(
              `grelhas.${i}.comprimentoCm`,
              "Comprimento",
              MEDIDAS.uruguaiaComprimento,
              g.comprimentoCm,
            ),
          stepper(`grelhas.${i}`, g.qtd, ng >= cap.grelhas),
          g.qtd > 0,
        ),
      ),
    );
    partes.push(
      cartao(
        "descanso",
        INFO.descanso.img,
        INFO.descanso.titulo,
        INFO.descanso.sub,
        medida("descanso.larguraCm", "Largura", MEDIDAS.descanso, m.descanso.larguraCm),
        stepper("descanso", m.descanso.qtd, m.descanso.qtd >= cap.descanso),
        m.descanso.qtd > 0,
      ),
    );
    m.espetos.forEach((e, i) =>
      partes.push(
        cartao(
          e.tipo,
          ESPETO_INFO[e.tipo].img,
          e.tipo === "espeto_v" ? "Espeto V" : `Espeto ${ESPETO_INFO[e.tipo].nome.toLowerCase()}`,
          ESPETO_INFO[e.tipo].nota,
          medida(`espetos.${i}.comprimentoCm`, "Comprimento", MEDIDAS.espeto, e.comprimentoCm),
          stepper(`espetos.${i}`, e.qtd, ne >= MAX_ESPETOS),
          e.qtd > 0,
        ),
      ),
    );
    for (const id of ACCS)
      partes.push(`<article class="onb-acc${s.acc[id] ? " no-kit" : ""}" data-acc="${id}">
      ${foto(ACC_INFO[id].img, ACC_INFO[id].titulo, 500, 500)}
      <div class="onb-acc-txt"><strong>${ACC_INFO[id].titulo}</strong><small>${ACC_INFO[id].texto}</small><span class="onb-acc-preco" data-preco-acc="${id}"></span></div>
      <button type="button" class="onb-acc-btn" data-acc-toggle="${id}" aria-pressed="${s.acc[id]}"><span class="onb-acc-acao">Adicionar</span></button>
    </article>`);
    conteudo.innerHTML = partes.join("");
    precosDasPecas();
  }

  /** Preço unitário de cada peça na medida escolhida (o acessório vem do módulo de acessórios). */
  function precosDasPecas() {
    const m = s.m;
    const pedir = (chave: string, sku: string | null) => {
      if (!sku) return;
      preco(sku).then((p) => {
        const el = conteudo.querySelector(`[data-preco-peca="${chave}"]`);
        if (el && p) el.textContent = brl(p.valor);
      });
    };
    pedir("suporte", skuPeca({ tipo: "suporte", larguraCm: m.suporte.larguraCm, qtd: 1 }));
    pedir("descanso", skuPeca({ tipo: "descanso", larguraCm: m.descanso.larguraCm, qtd: 1 }));
    m.grelhas.forEach((g) =>
      pedir(
        g.tipo,
        skuPeca({ tipo: g.tipo, larguraCm: g.larguraCm, comprimentoCm: g.comprimentoCm, qtd: 1 }),
      ),
    );
    m.espetos.forEach((e) =>
      pedir(e.tipo, skuPeca({ tipo: e.tipo, larguraCm: e.comprimentoCm, qtd: 1 })),
    );
    // os acessórios já têm preço em cache no módulo de acessórios; aqui só garantimos no 1º render
    ACCS.forEach((id) =>
      preco(ACESSORIOS[id].sku).then((p) => {
        const el = conteudo.querySelector(`[data-preco-acc="${id}"]`);
        if (el && p) el.textContent = brl(p.valor);
      }),
    );
  }

  function renderConteudo() {
    if (livre) renderLivre();
    else renderKit();
  }

  // ---------- mudanças na montagem (só no modo livre) ----------
  function aplicar() {
    s.m = normalizar(s.m);
    garantirLinhas();
    ctx.acoes.desenhar();
  }

  function definirCampo(caminho: string, valor: unknown) {
    const partes = caminho.split(".");
    let alvo = s.m as unknown as Record<string, unknown>;
    for (const p of partes.slice(0, -1)) alvo = alvo[p] as Record<string, unknown>;
    alvo[partes[partes.length - 1]] = valor;
    aplicar();
  }

  function medidaPeca(campo: string, bruto: number) {
    const caixa = conteudo.querySelector<HTMLInputElement>(`input[data-med="${campo}"]`);
    const ops = (caixa?.dataset.ops ?? "").split(",").map(Number);
    if (!ops.length || !Number.isFinite(bruto)) return;
    definirCampo(campo, encaixar(ops, bruto));
  }

  let tMed = 0;
  /** `input` numa régua de peça: o número acompanha na hora e encaixa na medida vendida ao parar. */
  function aoInput(t: HTMLInputElement) {
    if (!t.dataset.medRange) return false;
    const caixa = conteudo.querySelector<HTMLInputElement>(
      `input[data-med="${t.dataset.medRange}"]`,
    );
    if (caixa) caixa.value = t.value;
    pintarRegua(t);
    clearTimeout(tMed);
    const campo = t.dataset.medRange;
    tMed = window.setTimeout(() => medidaPeca(campo, Number(t.value)), 240);
    return true;
  }

  function aoChange(t: HTMLInputElement) {
    if (!t.dataset.med) return false;
    medidaPeca(t.dataset.med, Number(t.value));
    return true;
  }

  function aoClique(b: HTMLButtonElement) {
    if (b.dataset.pecaToggle === "suporte") {
      s.m.suporte.on = !s.m.suporte.on;
      aplicar();
    } else if (b.dataset.qtd) {
      const d = Number(b.dataset.d);
      if (b.dataset.qtd === "descanso") s.m.descanso.qtd = Math.max(0, s.m.descanso.qtd + d);
      else {
        const [g, i] = b.dataset.qtd.split(".") as [Grupo, string];
        const lista: { qtd: number }[] = g === "grelhas" ? s.m.grelhas : s.m.espetos;
        lista[Number(i)].qtd = Math.max(0, lista[Number(i)].qtd + d);
      }
      aplicar();
    } else return false;
    return true;
  }

  function destruir() {
    centro.disconnect();
  }

  return {
    escolherNo3D,
    fecharPop,
    popAberto: () => !pop.hidden,
    aoPop,
    renderConteudo,
    acenderPerto,
    apagarLinhas,
    aoInput,
    aoChange,
    aoClique,
    destruir,
  };
}
