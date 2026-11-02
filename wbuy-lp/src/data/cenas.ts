// As duas cenas do configurador. O KitConfigurador é um só; o que muda entre "Kit Premium" e
// "Montar o meu" é só isto: passos, instalações, churrasqueiras e como o preço se forma.
import type { Ambiente, Instalacao } from "../configurador/palco/cena3d";

export type CenaId = "premium" | "livre";
export type PassoId =
  | "instalacao"
  | "medidas"
  | "churrasqueira"
  | "kit"
  | "pecas"
  | "acessorios"
  | "resumo";

export type Cena = {
  id: CenaId;
  /** nos cartões de escolha do modo */
  rotulo: string;
  /** uma linha abaixo do rótulo */
  descricao: string;
  eyebrow: string;
  titulo: string;
  /** "kit": o Kit Premium da faixa, um produto; "pecas": cada peça é um produto */
  modo: "kit" | "pecas";
  passos: { id: PassoId; titulo: string }[];
  instalacoes: Instalacao[];
  ambientes: Ambiente[];
  /** o 3D começa só com o suporte na parede */
  soSuporte: boolean;
  /** medidas aceitas (caixa e régua), em cm: [mínimo, máximo] */
  limites: { a: [number, number]; b: [number, number] };
};

export const CENAS: Record<CenaId, Cena> = {
  premium: {
    id: "premium",
    rotulo: "Kit Premium",
    descricao: "Completo e sob medida: suporte, grelhas e espetos.",
    eyebrow: "Kit Premium",
    titulo: "Na medida da sua churrasqueira.",
    modo: "kit",
    passos: [
      { id: "medidas", titulo: "Medidas" },
      { id: "churrasqueira", titulo: "Sua churrasqueira" },
      { id: "kit", titulo: "O que vem no kit" },
      { id: "acessorios", titulo: "Acessórios" },
      { id: "resumo", titulo: "Resumo" },
    ],
    instalacoes: ["suspenso"],
    ambientes: ["fechada", "lateral", "gourmet", "estudio"],
    soSuporte: false,
    // as faixas do kit (catalog.ts): fora disso não há produto, então a régua nem deixa ir
    limites: { a: [50, 99], b: [40, 74] },
  },
  livre: {
    id: "livre",
    rotulo: "Montar o meu",
    descricao: "Peça por peça, só o que você quer.",
    eyebrow: "Montar o meu",
    titulo: "Peça por peça, do seu jeito.",
    modo: "pecas",
    passos: [
      { id: "instalacao", titulo: "Suspenso ou cooktop" },
      { id: "medidas", titulo: "Medidas" },
      { id: "churrasqueira", titulo: "Sua churrasqueira" },
      { id: "pecas", titulo: "Todas as peças" },
      { id: "resumo", titulo: "Resumo" },
    ],
    instalacoes: ["suspenso", "cooktop"],
    ambientes: ["fechada", "lateral", "bancada", "gourmet", "estudio"],
    soSuporte: true,
    // o que a fábrica faz peça a peça (A_MIN..A_MAX, B_MIN..B_MAX em builder.ts)
    limites: { a: [35, 139], b: [35, 74] },
  },
};

/** ?kit=premium|livre (padrão: premium). */
export const cenaDaUrl = (params: URLSearchParams): Cena =>
  CENAS[params.get("kit") === "livre" ? "livre" : "premium"];
