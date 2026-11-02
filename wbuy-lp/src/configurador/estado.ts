// Estado do configurador e o contexto que todos os passos compartilham.
import type { Composicao } from "@/lib/kitComposition";
import { faixaKit, montagemSugerida, type Grupo, type Montagem } from "../builder";
import { AMBIENTES, type AccId } from "../conteudo";
import type { BuilderStage } from "./palco/builderStage";
import type { Acessorios, Ambiente, Instalacao } from "./palco/cena3d";

export type Modo = "kit" | "pecas";
export type Estado = {
  a: number;
  b: number;
  modo: Modo;
  m: Montagem;
  foco: Grupo | null;
  inst: Instalacao;
  amb: Ambiente;
  acc: Acessorios;
  /** o passo das medidas está na tela (as cotas A e B só aparecem nele) */
  medidas: boolean;
};

/** Estado de partida: medidas, modo, instalação e churrasqueira vêm da URL (deep link). */
export function estadoInicial(params: URLSearchParams): Estado {
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
    medidas: false,
  };
  if (!faixaKit(s.a, s.b)) s.modo = "pecas";
  return s;
}

/** Ações que um passo chama em outro. Preenchidas pelo KitConfigurador depois de criar todos. */
export type Acoes = {
  desenhar: () => void;
  fecharPop: () => void;
  definirModo: (modo: Modo) => void;
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
