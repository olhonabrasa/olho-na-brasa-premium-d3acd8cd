// Passo "O que vem no kit": as seis linhas do Kit Premium e o balão que abre ao tocar numa
// peça do 3D. (O modo peça por peça volta no item 6, com a cena "livre".)
import { composicaoKit, faixaKit, grupoDaParte, linhasKit, type Grupo } from "../builder";
import { ACC_INFO, INFO, type AccId } from "../conteudo";
import { esc } from "../util";
import type { Ctx } from "./estado";

export function montarPecas(ctx: Ctx) {
  const { $, s } = ctx;
  const stageEl = $(".onb-stage");
  const pop = $(".onb-pop");
  const conteudo = $("#onb-conteudo");
  const faixa = $(".onb-faixa");

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

  pop.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-pop]");
    if (!b) return;
    if (b.dataset.pop === "tirar-acc") ctx.acoes.alternarAcessorio(b.dataset.acc as AccId, false);
    fecharPop();
  });

  function rotuloPeca(g: Grupo, idx: number) {
    const c = ctx.comp;
    if (!c) return "";
    if (g === "suporte") return `${c.suporteLarguraCm} cm · 3 níveis`;
    if (g === "grelhas") return `Uruguaia ${c.uruguaia.larguraCm}×${c.uruguaia.comprimentoCm} cm`;
    if (g === "descanso") return c.descanso ? `${c.descanso.larguraCm} cm` : "";
    return `${idx === 1 ? "Simples" : "Duplo"} ${c.espetos.comprimentoCm} cm`;
  }

  // ---------- a linha que cruza o meio da tela acende a peça no 3D ----------
  // mais de uma linha pode cruzar a faixa central: acende a mais perto do meio da tela
  const centro = new IntersectionObserver(
    (es) => es.some((e) => e.isIntersecting) && acenderPerto(),
    { rootMargin: "-45% 0px -45% 0px" },
  );
  const linhas = () => [...conteudo.querySelectorAll<HTMLElement>("li[data-peca]")];

  /** Acende a linha mais perto do meio da tela (pelo observer e quando o passo 3 vira o ativo). */
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

  // ---------- as seis linhas ----------
  function renderConteudo() {
    const f = faixaKit(s.a, s.b);
    const c = f ? composicaoKit(s.a, s.b) : null;
    faixa.hidden = !!f && f.a === s.a && f.b === s.b;
    faixa.innerHTML = f
      ? `Kit da faixa <strong>${f.a}×${f.b} cm</strong>, para a sua boca de ${s.a}×${s.b} cm.`
      : `Sua medida está fora das faixas do kit (50–99 × 40–74 cm). <button type="button" class="onb-link-inline" data-whats>Fale com a fábrica</button>: a gente faz sob medida.`;
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

  return {
    escolherNo3D,
    fecharPop,
    popAberto: () => !pop.hidden,
    renderConteudo,
    acenderPerto,
    apagarLinhas,
  };
}
