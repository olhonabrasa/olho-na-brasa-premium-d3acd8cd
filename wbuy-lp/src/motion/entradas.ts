// Entradas suaves: blocos marcados com .onb-sobe ganham .visto ao entrar na tela (uma vez).
export function entradasSuaves(root: HTMLElement, reduzido: boolean) {
  if (reduzido) return;
  const io = new IntersectionObserver(
    (es) =>
      es.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("visto");
          io.unobserve(e.target);
        }
      }),
    { rootMargin: "0px 0px -8% 0px" },
  );
  root.querySelectorAll(".onb-sobe").forEach((el) => io.observe(el));
  root.classList.add("onb-anima");
}
