// prefers-reduced-motion: quem pede menos movimento recebe o mesmo conteúdo sem transições.
export const reduzMovimento = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
