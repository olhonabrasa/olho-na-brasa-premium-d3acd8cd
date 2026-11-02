// Passo da churrasqueira: instalação (suspenso ou cooktop) e o cenário em volta do kit.
import type { Ctx } from "./estado";
import type { Ambiente, Instalacao } from "./palco/cena3d";

export function montarChurrasqueira(ctx: Ctx) {
  const { root, s } = ctx;

  function renderEscolhas() {
    root
      .querySelectorAll<HTMLButtonElement>(".onb-painel [data-inst]")
      .forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.inst === s.inst)));
    root
      .querySelectorAll<HTMLButtonElement>("[data-amb]")
      .forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.amb === s.amb)));
  }

  function definirInstalacao(inst: Instalacao) {
    s.inst = inst;
    // churrasqueira coerente com a escolha, a menos que o cliente já tenha escolhido outra
    if (inst === "cooktop" && s.amb === "fechada") s.amb = "bancada";
    if (inst === "suspenso" && s.amb === "bancada") s.amb = "gourmet";
    ctx.acoes.desenhar();
  }

  function definirAmbiente(amb: Ambiente) {
    s.amb = amb;
    ctx.acoes.desenhar();
  }

  /** Clique num chip de instalação ou de cenário. Devolve true se era daqui. */
  function aoClique(b: HTMLButtonElement) {
    if (b.dataset.inst) definirInstalacao(b.dataset.inst as Instalacao);
    else if (b.dataset.amb) definirAmbiente(b.dataset.amb as Ambiente);
    else return false;
    return true;
  }

  return { renderEscolhas, definirInstalacao, aoClique };
}
