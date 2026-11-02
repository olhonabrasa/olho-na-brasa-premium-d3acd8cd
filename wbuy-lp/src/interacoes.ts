// Comportamento das dobras (tudo fora do montador): vídeo do topo,
// carrossel de destaques, antes e depois, vídeos, WhatsApp e barras fixas.
// As entradas suaves e o prefers-reduced-motion estão em motion/.
import { WHATS } from "./conteudo";
import { IMG } from "./util";

/** Abre o chat flutuante da loja; sem ele, cai no WhatsApp direto. */
export function abrirWhats(texto?: string) {
  const w = window as unknown as { lbToggleChat?: () => void };
  const chat = document.getElementById("lb-chat-window");
  const aberto = chat && getComputedStyle(chat).display !== "none" && chat.offsetHeight > 0;
  if (typeof w.lbToggleChat === "function") {
    if (!aberto) w.lbToggleChat();
    return;
  }
  const botao = document.getElementById("lb-toggle-btn");
  if (botao) return botao.click();
  window.open(WHATS + (texto ? "?text=" + encodeURIComponent(texto) : ""), "_blank", "noopener");
}

// ---------- topo: o vídeo do kit (toca uma vez e para no quadro de descanso) ----------

/**
 * O pôster (<picture>, LCP) fica por baixo; o vídeo só começa a baixar depois que a página carregou
 * (preload="none" até lá) e só aparece por cima quando o primeiro quadro estiver pronto.
 * Sem loop, sem controles, sem áudio. Menos movimento, economia de dados ou página já rolada:
 * fica o pôster com o botão para assistir.
 */
export function filmeTopo(root: HTMLElement, reduzido: boolean) {
  const hero = root.querySelector<HTMLElement>(".onb-hero")!;
  const video = hero.querySelector<HTMLVideoElement>(".onb-hero-video")!;
  const replay = hero.querySelector<HTMLButtonElement>(".onb-hero-replay")!;
  const conexao = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  let carregado = false;

  const mostrarBotao = (rotulo: string) => {
    replay.innerHTML = rotulo;
    replay.hidden = false;
  };
  const carregar = () => {
    if (carregado) return;
    carregado = true;
    video.preload = "auto";
    video.load();
  };
  const tocar = () => {
    replay.hidden = true;
    if (!carregado) {
      video.autoplay = true;
      video.addEventListener("canplay", () => video.play().catch(falhou), { once: true });
      carregar();
      return;
    }
    video.currentTime = 0;
    video.play().catch(falhou);
  };
  const falhou = () => mostrarBotao('<span aria-hidden="true">▶</span> Ver a montagem');

  video.addEventListener("playing", () => hero.classList.add("video-ativo"));
  video.addEventListener("ended", () =>
    mostrarBotao('<span aria-hidden="true">↻</span> Ver a montagem de novo'),
  );
  video.addEventListener("error", falhou);
  replay.addEventListener("click", tocar);

  // fora da tela, pausa; ao voltar, continua de onde parou
  new IntersectionObserver(([e]) => {
    if (!carregado || video.ended || !replay.hidden) return;
    if (e.isIntersecting) video.play().catch(() => {});
    else video.pause();
  }).observe(hero);

  if (reduzido || conexao?.saveData || scrollY > 200) return falhou();
  // o vídeo não disputa banda com o pôster e o CSS: começa depois do load da página
  if (document.readyState === "complete") tocar();
  else addEventListener("load", tocar, { once: true });
}

// ---------- destaques: um vídeo por cartão, passa sozinho quando o vídeo acaba ----------

export function carrosselDestaques(root: HTMLElement, reduzido: boolean) {
  const sec = root.querySelector<HTMLElement>(".onb-destaques")!;
  const trilho = sec.querySelector<HTMLElement>(".onb-dest-trilho")!;
  const cards = [...sec.querySelectorAll<HTMLElement>(".onb-dest-card")];
  const pontos = [...sec.querySelectorAll<HTMLButtonElement>("[data-dest]")];
  const btnPlay = sec.querySelector<HTMLButtonElement>("[data-dest-play]")!;
  let atual = 0;
  let tocando = !reduzido;
  let visivel = false;
  let seguranca = 0;
  let pausadoPorModal = false;

  const video = (i: number) => cards[i].querySelector("video")!;

  function ir(i: number, rolar = true) {
    atual = (i + cards.length) % cards.length;
    pontos.forEach((p, k) => p.toggleAttribute("aria-current", k === atual));
    if (rolar) {
      const c = cards[atual];
      trilho.scrollTo({
        left: c.offsetLeft - (trilho.clientWidth - c.clientWidth) / 2,
        behavior: reduzido ? "auto" : "smooth",
      });
    }
    clearTimeout(seguranca);
    cards.forEach((c, k) => {
      const v = video(k);
      c.classList.toggle("ativo", k === atual);
      if (k === atual && visivel && tocando && !pausadoPorModal) {
        v.preload = "auto";
        if (rolar) v.currentTime = 0;
        v.play().catch(() => {});
      } else v.pause();
    });
    // a barrinha do ponto atual dura o mesmo que o vídeo
    const v = video(atual);
    const definir = () => {
      const ms = Math.round((v.duration || 6) * 1000);
      sec.style.setProperty("--onb-dest-ms", ms + "ms");
      if (visivel && tocando && !pausadoPorModal)
        seguranca = window.setTimeout(() => ir(atual + 1), ms - v.currentTime * 1000 + 900);
    };
    if (v.readyState >= 1) definir();
    else v.addEventListener("loadedmetadata", definir, { once: true });
    if (visivel) video((atual + 1) % cards.length).preload = "metadata";
    sec.classList.toggle("tocando", visivel && tocando && !pausadoPorModal);
  }
  cards.forEach((c, k) => {
    video(k).addEventListener("ended", () => k === atual && tocando && ir(atual + 1));
    c.addEventListener("click", () => k !== atual && ir(k));
  });
  pontos.forEach((p, k) => p.addEventListener("click", () => ir(k)));
  btnPlay.addEventListener("click", () => {
    tocando = !tocando;
    btnPlay.classList.toggle("pausado", !tocando);
    btnPlay.setAttribute("aria-label", tocando ? "Pausar destaques" : "Tocar destaques");
    ir(atual, false);
  });
  btnPlay.classList.toggle("pausado", !tocando);
  // arrastar o trilho escolhe o cartão mais centralizado
  let tRol = 0;
  trilho.addEventListener(
    "scroll",
    () => {
      clearTimeout(tRol);
      tRol = window.setTimeout(() => {
        const meio = trilho.scrollLeft + trilho.clientWidth / 2;
        let melhor = 0;
        cards.forEach((c, k) => {
          const d = Math.abs(c.offsetLeft + c.clientWidth / 2 - meio);
          if (d < Math.abs(cards[melhor].offsetLeft + cards[melhor].clientWidth / 2 - meio))
            melhor = k;
        });
        if (melhor !== atual) ir(melhor, false);
      }, 140);
    },
    { passive: true },
  );
  new IntersectionObserver(
    ([e]) => {
      visivel = e.isIntersecting;
      ir(atual, false);
    },
    { threshold: 0.35 },
  ).observe(trilho);
  return {
    pausar(on: boolean) {
      pausadoPorModal = on;
      ir(atual, false);
    },
  };
}

// ---------- antes e depois: arrastar a linha revela o depois ----------

export function antesDepois(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>("[data-ad]").forEach((comp) => {
    const range = comp.querySelector<HTMLInputElement>(".onb-ad-range")!;
    const pos = (v: number) => comp.style.setProperty("--onb-corte", v + "%");
    range.addEventListener("input", () => pos(Number(range.value)));
    // arrastar em qualquer ponto da foto (não só no controle)
    let arrastando = false;
    const de = (x: number) => {
      const r = comp.getBoundingClientRect();
      const v = Math.min(98, Math.max(2, ((x - r.left) / r.width) * 100));
      range.value = String(v);
      pos(v);
    };
    comp.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "touch") return; // no toque, o trilho rola; o controle cuida do arraste
      arrastando = true;
      comp.setPointerCapture(e.pointerId);
      de(e.clientX);
    });
    comp.addEventListener("pointermove", (e) => arrastando && de(e.clientX));
    const solta = () => (arrastando = false);
    comp.addEventListener("pointerup", solta);
    comp.addEventListener("pointercancel", solta);
  });
  const trilho = root.querySelector<HTMLElement>(".onb-ad-trilho");
  const pontos = [...root.querySelectorAll<HTMLElement>(".onb-ad-pontos i")];
  if (!trilho) return;
  trilho.addEventListener(
    "scroll",
    () => {
      const cards = [...trilho.children] as HTMLElement[];
      const meio = trilho.scrollLeft + trilho.clientWidth / 2;
      let melhor = 0;
      cards.forEach((c, k) => {
        if (
          Math.abs(c.offsetLeft + c.clientWidth / 2 - meio) <
          Math.abs(cards[melhor].offsetLeft + cards[melhor].clientWidth / 2 - meio)
        )
          melhor = k;
      });
      pontos.forEach((p, k) => p.classList.toggle("on", k === melhor));
    },
    { passive: true },
  );
}

// ---------- vídeos ----------

/** Vídeo grande por cima da página (o "Assistir ao vídeo" dos destaques). */
export function modalDeVideo(root: HTMLElement, aoAbrir: (aberto: boolean) => void) {
  const modal = root.querySelector<HTMLDialogElement>(".onb-modal")!;
  const v = modal.querySelector("video")!;
  root.querySelectorAll<HTMLElement>("[data-abrir-video]").forEach((b) =>
    b.addEventListener("click", () => {
      const nome = b.dataset.abrirVideo!;
      v.src = `${IMG}${nome}.mp4`;
      v.poster = `${IMG}${nome}.webp`;
      if (typeof modal.showModal === "function") modal.showModal();
      else modal.setAttribute("open", "");
      v.play().catch(() => {});
      aoAbrir(true);
    }),
  );
  const fechar = () => {
    v.pause();
    modal.close?.();
    modal.removeAttribute("open");
  };
  modal.addEventListener("click", (e) => {
    if (e.target === modal || (e.target as HTMLElement).closest("[data-fechar-modal]")) fechar();
  });
  modal.addEventListener("close", () => {
    v.pause();
    aoAbrir(false);
  });
}

/** Capa com play que vira vídeo na hora (com som, porque o clique liberou). */
export function videosNaHora(root: HTMLElement) {
  root.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-video]");
    if (!b) return;
    const v = document.createElement("video");
    v.src = b.dataset.video!;
    v.poster = b.dataset.poster ?? "";
    v.controls = true;
    v.playsInline = true;
    v.className = "onb-video-tocando";
    b.replaceWith(v);
    v.play().catch(() => {});
  });
}

// ---------- setas dos carrosséis (desktop) ----------

/** Cada bloco [data-setas] comanda o trilho logo antes dele: anda um cartão e apaga a seta no fim. */
export function setasCarrossel(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>("[data-setas]").forEach((setas) => {
    const trilho = setas.previousElementSibling as HTMLElement | null;
    if (!trilho) return;
    const [antes, depois] = setas.querySelectorAll<HTMLButtonElement>("[data-seta]");
    const atualizar = () => {
      const fim = trilho.scrollWidth - trilho.clientWidth - 4;
      antes.disabled = trilho.scrollLeft <= 4;
      depois.disabled = trilho.scrollLeft >= fim;
    };
    setas.addEventListener("click", (ev) => {
      const b = (ev.target as Element).closest<HTMLButtonElement>("[data-seta]");
      if (!b) return;
      const cartao = trilho.firstElementChild as HTMLElement | null;
      const passo = (cartao?.offsetWidth ?? trilho.clientWidth * 0.8) + 20;
      trilho.scrollBy({ left: Number(b.dataset.seta) * passo, behavior: "smooth" });
    });
    trilho.addEventListener("scroll", atualizar, { passive: true });
    addEventListener("resize", atualizar);
    atualizar();
  });
}

// ---------- barras fixas ----------

/**
 * Barra "Kit Premium" (desktop) e dock de preço (celular): aparecem depois do topo, somem no resumo.
 * O chat flutuante da loja (#lb-widget-container) some enquanto o montador está na tela e, fora dele,
 * sobe a altura do dock enquanto o dock está aberto: nada pode cobrir o botão Comprar.
 */
export function barrasFixas(root: HTMLElement) {
  const resumo = root.querySelector(".onb-resumo")!;
  const dock = root.querySelector<HTMLElement>(".onb-dock")!;
  const barra = root.querySelector(".onb-barra-produto")!;
  const hero = root.querySelector(".onb-hero")!;
  const montador = root.querySelector("#onb-montador")!;
  let resumoVisivel = false;
  let heroVisivel = true;
  let montadorVisivel = false;
  const atualizar = () => {
    const dockOn = !resumoVisivel && !heroVisivel;
    dock.classList.toggle("on", dockOn);
    barra.classList.toggle("on", !heroVisivel);
    // o dock só existe no celular (display none no desktop): sem retângulo, não está na página
    const dockNaTela = dockOn && dock.getClientRects().length > 0;
    const html = document.documentElement;
    html.classList.toggle("onb-sem-chat", montadorVisivel);
    html.classList.toggle("onb-dock-aberto", dockNaTela && !montadorVisivel);
    if (dockNaTela) html.style.setProperty("--onb-dock-h", `${dock.offsetHeight}px`);
  };
  const observar = (el: Element, guardar: (visivel: boolean) => void) =>
    new IntersectionObserver(([e]) => {
      guardar(e.isIntersecting);
      atualizar();
    }).observe(el);
  observar(resumo, (v) => (resumoVisivel = v));
  observar(hero, (v) => (heroVisivel = v));
  observar(montador, (v) => (montadorVisivel = v));
  addEventListener("resize", atualizar);
}
