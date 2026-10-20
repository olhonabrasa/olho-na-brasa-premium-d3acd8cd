// Pequenos utilitários usados por todas as partes da LP.
export const ASSET_BASE: string = import.meta.env.DEV ? "/" : "https://premium.olhonabrasa.com.br/";
export const IMG = ASSET_BASE + "wbuy-lp/img/";

export const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** <img> com tamanho reservado (sem pulo de layout) e carregamento preguiçoso. */
export const foto = (nome: string, alt: string, w: number, h: number, cls = "", eager = false) =>
  `<img src="${IMG}${nome}.webp" alt="${esc(alt)}" width="${w}" height="${h}"${cls ? ` class="${cls}"` : ""} ${
    eager ? 'fetchpriority="high"' : 'loading="lazy"'
  } decoding="async">`;

export const reduzMovimento = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
