// Estado do configurador e o contexto que todos os passos compartilham.
import type { Composicao } from "@/lib/kitComposition";
import { montagemSugerida, type Grupo, type Montagem } from "../builder";
import type { AccId } from "../conteudo";
import type { Cena } from "../data/cenas";
import type { BuilderStage } from "./palco/builderStage";
import type { Acessorios, Ambiente, Instalacao } from "./palco/cena3d";

export type Modo = "kit" | "pecas";
export type Estado = {
  a: number;
  b: number;
  modo: Modo;
  /** montagem peça por peça (no premium só alimenta o 3D fora da faixa do kit) */
  m: Montagem;
  foco: Grupo | null;
  inst: Instalacao;
  amb: Ambiente;
  acc: Acessorios;
  /** o passo das medidas está na tela (as cotas A e B só aparecem nele) */
  medidas: boolean;
};

/**
 * Estado de partida de uma cena. Medidas, instalação e churrasqueira vêm da URL
 * (?a=70&b=60&inst=cooktop&amb=fechada); ao trocar de cena, A e B são herdados e o resto reinicia.
 */
export function estadoInicial(
  params: URLSearchParams,
  cena: Cena,
  herdar?: { a: number; b: number },
): Estado {
  const a0 = herdar?.a ?? (Number(params.get("a")) || 70);
  const b0 = herdar?.b ?? (Number(params.get("b")) || 60);
  const instParam = params.get("inst") as Instalacao | null;
  const inst = instParam && cena.instalacoes.includes(instParam) ? instParam : cena.instalacoes[0];
  const ambParam = params.get("amb") as Ambiente | null;
  const m = montagemSugerida(a0, b0);
  if (cena.soSuporte) {
    m.grelhas.forEach((g) => (g.qtd = 0));
    m.descanso.qtd = 0;
    m.espetos.forEach((e) => (e.qtd = 0));
  }
  return {
    a: a0,
    b: b0,
    modo: cena.modo,
    m,
    foco: null,
    inst,
    amb:
      ambParam && cena.ambientes.includes(ambParam)
        ? ambParam
        : inst === "cooktop"
          ? "bancada"
          : "fechada",
    acc: { giratorio: false, cesto: false, bandeja: false, defumador: false },
    medidas: false,
  };
}

/** Ações que um passo chama em outro. Preenchidas pelo KitConfigurador depois de criar todos. */
export type Acoes = {
  desenhar: () => void;
  fecharPop: () => void;
  definirInstalacao: (inst: Instalacao) => void;
  alternarAcessorio: (id: AccId, on?: boolean) => void;
  irMontador: () => void;
  /** mostra ou esconde as cotas A e B sobre o 3D */
  cotas: (on: boolean) => void;
  /** valor da régua em arraste (null quando solta): a cota acompanha em tempo real */
  previaMedida: (nome: "a" | "b", valor: number | null) => void;
  /** ao entrar no passo do kit: acende a linha mais perto do meio da tela */
  acenderDestaque: () => void;
  /** ao sair do passo do kit: nenhuma linha acesa, 3D inteiro a 1 */
  apagarDestaque: () => void;
};

export type Ctx = {
  root: HTMLElement;
  $: <T extends Element = HTMLElement>(sel: string) => T;
  s: Estado;
  cena: Cena;
  params: URLSearchParams;
  reduzido: boolean;
  /** 3D (null até carregar) e a composição desenhada por último */
  stage: BuilderStage | null;
  comp: Composicao | null;
  /** passo na tela, de 1 em diante (0 = nenhum ainda) */
  passo: number;
  acoes: Acoes;
};
