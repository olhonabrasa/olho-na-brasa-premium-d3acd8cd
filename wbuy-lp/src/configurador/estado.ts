// Estado do configurador e o contexto que todos os passos compartilham.
import type { Composicao } from "@/lib/kitComposition";
import { montagemSugerida, type Grupo, type Montagem } from "../builder";
import { AMBIENTES, type AccId } from "../conteudo";
import type { BuilderStage } from "./palco/builderStage";
import type { Acessorios, Ambiente, Instalacao } from "./palco/cena3d";

export type Modo = "kit" | "pecas";
export type Estado = {
  a: number;
  b: number;
  modo: Modo;
  /** montagem peça por peça sugerida para a medida (hoje só alimenta o 3D fora da faixa do kit) */
  m: Montagem;
  foco: Grupo | null;
  inst: Instalacao;
  amb: Ambiente;
  acc: Acessorios;
  /** o passo das medidas está na tela (as cotas A e B só aparecem nele) */
  medidas: boolean;
};

/** Estado de partida do Kit Premium: medidas e churrasqueira vêm da URL (deep link ?a=70&b=60&amb=fechada). */
export function estadoInicial(params: URLSearchParams): Estado {
  const a0 = Number(params.get("a")) || 70;
  const b0 = Number(params.get("b")) || 60;
  const ambParam = params.get("amb") as Ambiente | null;
  return {
    a: a0,
    b: b0,
    modo: "kit",
    m: montagemSugerida(a0, b0),
    foco: null,
    inst: "suspenso",
    // bancada é cenário do cooktop, que só existe no modo "livre" (item 6)
    amb:
      ambParam && ambParam !== "bancada" && AMBIENTES.some((x) => x.id === ambParam)
        ? ambParam
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
};

export type Ctx = {
  root: HTMLElement;
  $: <T extends Element = HTMLElement>(sel: string) => T;
  s: Estado;
  params: URLSearchParams;
  reduzido: boolean;
  /** 3D (null até carregar) e a composição desenhada por último */
  stage: BuilderStage | null;
  comp: Composicao | null;
  /** passo na tela, de 1 em diante (0 = nenhum ainda) */
  passo: number;
  acoes: Acoes;
};
