// O palco: carrega o 3D quando o montador chega perto da tela e o mantém em dia com o estado.
import { conteudoKit, espetosPorPeca, grelhasPorPeca, pecasDaMontagem } from "../../builder";
import { AMBIENTES } from "../../conteudo";
import { ASSET_BASE } from "../../util";
import type { Ctx } from "../estado";
import { desenhoFrente } from "./fallback";

type Opcoes = {
  /** clique numa peça (ou no vazio) do 3D, em px do palco */
  aoEscolher: (parte: string | null, x: number, y: number) => void;
  /** a cada quadro desenhado: reposiciona o que fica por cima do canvas */
  aoDesenhar: () => void;
};

export function montarPalco(ctx: Ctx, { aoEscolher, aoDesenhar }: Opcoes) {
  const { $, params } = ctx;
  const stageEl = $(".onb-stage");
  const canvas = $<HTMLCanvasElement>(".onb-stage canvas");

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
        if (e.isIntersecting && !ctx.stage && !stageEl.dataset.carregando) carregar3D();
        ctx.stage?.setActive(e.isIntersecting);
      },
      { rootMargin: "400px 0px" },
    );
    io.observe(stageEl);
  }

  function carregar3D() {
    stageEl.dataset.carregando = "1";
    import("./builderStage")
      .then(({ createBuilderStage }) => {
        const stage = createBuilderStage(stageEl, canvas, {
          mobile,
          reducedMotion: ctx.reduzido,
          assetBase: ASSET_BASE,
          onProgress: (p) => stageEl.style.setProperty("--onb-progresso", String(p)),
          onPick: aoEscolher,
          onRender: aoDesenhar,
        });
        ctx.stage = stage;
        canvas.style.touchAction = "pan-y";
        stageEl.classList.add("com-3d");
        ctx.acoes.desenhar();
        stage.setActive(true);
        if (params.has("fps"))
          setInterval(() => ($(".onb-fps").textContent = JSON.stringify(stage.stats())), 1000);
      })
      .catch((err) => {
        console.error(err);
        stageEl.classList.add("sem-3d");
        ctx.acoes.desenhar();
      });
  }

  /** Leva a composição atual para o 3D, o desenho de reserva e o leitor de tela. */
  function atualizar() {
    const { s, comp } = ctx;
    if (!comp) return;
    const fantasma = s.modo === "pecas" && !s.m.suporte.on ? ["suporte"] : [];
    ctx.stage?.update(comp, {
      fantasma,
      instalacao: s.inst,
      ambiente: s.amb,
      grelhas: s.modo === "pecas" ? grelhasPorPeca(s.m) : undefined,
      espetos:
        s.modo === "pecas"
          ? espetosPorPeca(s.m)
          : Array.from({ length: comp.espetos.quantidade }, () => ({
              tipo: "espeto_duplo" as const,
              comprimentoCm: comp.espetos.comprimentoCm,
            })),
      acessorios: s.acc,
      boca: { a: s.a, b: s.b },
      medidas: s.medidas,
    });
    $(".onb-fallback").innerHTML = desenhoFrente(comp, fantasma.length > 0);
    canvas.setAttribute("aria-label", descreverParaLeitor());
  }

  function descreverParaLeitor() {
    const { s, comp } = ctx;
    const itens =
      s.modo === "kit" && comp
        ? conteudoKit(comp, s.inst === "cooktop")
        : pecasDaMontagem(s.m).map((i) => `${i.peca.qtd}× ${i.rotulo}`);
    const amb = AMBIENTES.find((x) => x.id === s.amb)!.nome.toLowerCase();
    return `Kit ${s.inst} em 3D, churrasqueira ${amb} de ${s.a} por ${s.b} cm: ${itens.join(", ")}.`;
  }

  return { stageEl, atualizar };
}
