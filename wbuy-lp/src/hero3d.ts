// Topo em 3D. O pôster é o primeiro quadro (LCP); depois do load da página, com o navegador ocioso,
// o mesmo palco do configurador entra no lugar e o kit é montado peça a peça na parede: suporte de
// cima, grelhas e espetos de frente, cada peça em 520 ms com fade, escalonadas. Rolar gira a câmera
// poucos graus para a vista 3/4; arrastar gira o kit; "Ver a montagem de novo" repete a entrada.
// Sem WebGL, com economia de dados ou erro no 3D, fica o pôster. Com "reduzir movimento": o 3D
// aparece pronto, sem entrada nem giro.
import { composicaoKit } from "./builder";
import type { BuilderStage } from "./configurador/palco/builderStage";
import { ASSET_BASE } from "./util";

/** a medida mais vendida, a mesma com que o montador abre */
const A = 70;
const B = 60;
/** ordem da montagem: o que segura, depois o que apoia, por último o que espeta */
const ORDEM = ["suporte", "grelha_uruguaia", "grelha_descanso", "espeto_duplo", "espeto_chata"];
const ESCALONAR_MS = 140;
/** a primeira peça começa a entrar enquanto o canvas ainda aparece sobre o pôster (0,6 s) */
const INICIO_MS = 350;

export function heroTresD(root: HTMLElement, reduzido: boolean) {
  const hero = root.querySelector<HTMLElement>(".onb-hero")!;
  const midia = hero.querySelector<HTMLElement>(".onb-hero-midia")!;
  const canvas = midia.querySelector<HTMLCanvasElement>(".onb-hero-canvas")!;
  const replay = hero.querySelector<HTMLButtonElement>(".onb-hero-replay")!;
  const conexao = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;

  const temWebGL = (() => {
    try {
      const c = document.createElement("canvas");
      return !!(c.getContext("webgl2") || c.getContext("webgl"));
    } catch {
      return false;
    }
  })();
  if (!temWebGL || conexao?.saveData) {
    midia.classList.add("sem-3d");
    return;
  }

  const mobile = matchMedia("(max-width: 899px), (pointer: coarse)").matches;
  let stage: BuilderStage | null = null;
  let carregando = false;
  let naTela = false;
  let paginaPronta = document.readyState === "complete";
  let fimMontagem = 0;

  function montar() {
    if (!stage) return;
    replay.hidden = true;
    clearTimeout(fimMontagem);
    const dura = stage.montar(ORDEM, { escalonarMs: ESCALONAR_MS, inicioMs: INICIO_MS });
    if (dura) fimMontagem = window.setTimeout(() => (replay.hidden = false), dura + 400);
  }

  function carregar() {
    if (carregando) return;
    carregando = true;
    import("./configurador/palco/builderStage")
      .then(({ createBuilderStage }) => {
        const s = createBuilderStage(midia, canvas, {
          mobile,
          reducedMotion: reduzido,
          assetBase: ASSET_BASE,
          semDeslocamento: true,
          aproximacao: 0.8, // o topo é vitrine: o kit preenche mais a caixa que no montador
          onProgress: (p) => midia.style.setProperty("--onb-progresso", String(p)),
        });
        const comp = composicaoKit(A, B)!;
        s.update(comp, {
          ambiente: "fechada",
          instalacao: "suspenso",
          boca: { a: A, b: B },
          // o Kit Premium leva um espeto duplo e um simples (barra chata)
          espetos: [
            { tipo: "espeto_duplo", comprimentoCm: comp.espetos.comprimentoCm },
            { tipo: "espeto_chata", comprimentoCm: comp.espetos.comprimentoCm },
          ],
        });
        stage = s;
        canvas.style.touchAction = "pan-y";
        s.setActive(naTela);
        midia.classList.add("com-3d");
        montar();
      })
      .catch((err) => {
        console.error(err);
        midia.classList.add("sem-3d");
      });
  }

  // o 3D não disputa banda com o pôster e o CSS: começa depois do load, com o navegador ocioso,
  // e só se o topo estiver na tela (quem já rolou recebe o 3D quando voltar)
  const quandoOcioso = (fn: () => void) => {
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
    };
    if (w.requestIdleCallback) w.requestIdleCallback(fn, { timeout: 1500 });
    else setTimeout(fn, 300);
  };
  const tentar = () => {
    if (naTela && paginaPronta && !stage) quandoOcioso(carregar);
  };
  new IntersectionObserver(([e]) => {
    naTela = e.isIntersecting;
    stage?.setActive(naTela);
    tentar();
  }).observe(midia);
  if (!paginaPronta)
    addEventListener(
      "load",
      () => {
        paginaPronta = true;
        tentar();
      },
      { once: true },
    );

  replay.addEventListener("click", montar);

  // rolar o topo para fora gira a câmera poucos graus (só a câmera; nada de layout)
  if (!reduzido) {
    let pendente = false;
    addEventListener(
      "scroll",
      () => {
        if (pendente || !stage || !naTela) return;
        pendente = true;
        requestAnimationFrame(() => {
          pendente = false;
          const r = hero.getBoundingClientRect();
          stage?.orbitar(-r.top / Math.max(r.height, 1));
        });
      },
      { passive: true },
    );
  }
}
