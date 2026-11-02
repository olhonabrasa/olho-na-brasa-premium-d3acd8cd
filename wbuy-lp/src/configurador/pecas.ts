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
  }

  return { escolherNo3D, fecharPop, popAberto: () => !pop.hidden, renderConteudo };
}
