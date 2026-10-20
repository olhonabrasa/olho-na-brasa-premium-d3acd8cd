// Comportamento das dobras (tudo fora do montador): abertura com a brasa,
// carrossel de destaques, antes e depois, vídeos, WhatsApp e entradas suaves.
import { WHATS } from "./conteudo";
import { IMG } from "./util";

const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";

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

// ---------- abertura: uma brasa acende, a câmera recua, aparece o kit ----------

type Brasa = {
  x: number;
  y: number;
  r: number;
  acende: number;
  fase: number;
  vel: number;
  forma: number[];
  giro: number;
};
type Faisca = { x: number; y: number; vx: number; vy: number; vida: number; max: number };

export function aberturaBrasa(root: HTMLElement, reduzido: boolean) {
  const hero = root.querySelector<HTMLElement>(".onb-hero")!;
  const canvas = hero.querySelector<HTMLCanvasElement>(".onb-brasa")!;
  const img = hero.querySelector<HTMLImageElement>(".onb-hero-img")!;
  const textos = [
    ...hero.querySelectorAll<HTMLElement>(".onb-marca, .onb-hero-esq, .onb-hero-dir"),
  ];
  // já rolou a página ou pediu menos movimento: mostra o resultado direto
  if (reduzido || scrollY > 200) {
    hero.classList.add("onb-intro-fim");
    return;
  }
  hero.classList.add("onb-intro");
  img.style.opacity = "0";
  const ctx = canvas.getContext("2d")!;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  let W = 0;
  let H = 0;
  const medir = () => {
    W = hero.clientWidth;
    H = hero.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  medir();
  addEventListener("resize", medir);

  // pseudoaleatório fixo para a cena sair igual sempre
  let semente = 9;
  const rnd = () => ((semente = (semente * 16807) % 2147483647) - 1) / 2147483646;
  const brasas: Brasa[] = [];
  for (let i = 0; i < 340; i++) {
    const ang = rnd() * Math.PI * 2;
    const d = Math.pow(rnd(), 0.6);
    brasas.push({
      x: Math.cos(ang) * d * 1.25,
      y: Math.sin(ang) * d * 0.55,
      r: 0.008 + rnd() * 0.022,
      // de dentro para fora: a primeira brasa é a do centro
      acende: i === 0 ? 0 : 0.06 + Math.pow(d, 0.9) * 0.55 + rnd() * 0.08,
      fase: rnd() * Math.PI * 2,
      vel: 2 + rnd() * 3,
      // contorno irregular de pedra de carvão (7 pontas com raios diferentes)
      forma: Array.from({ length: 7 }, () => 0.7 + rnd() * 0.45),
      giro: rnd() * Math.PI * 2,
    });
  }
  brasas[0].x = 0;
  brasas[0].y = 0;
  brasas[0].r = 0.03;
  const faiscas: Faisca[] = [];

  const DUR = 3600;
  const t0 = performance.now();
  const centro = () => ({ x: W * 0.5, y: H * 0.64 });
  const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  let revelou = false;
  let fim = false;

  const cor = (calor: number, a: number) =>
    // do vermelho escuro ao laranja; só o miolo chega perto do amarelo
    `rgba(255,${Math.round(70 + calor * 110)},${Math.round(15 + calor * 30)},${a})`;

  function pedra(b: Brasa, x: number, y: number, r: number) {
    ctx.beginPath();
    b.forma.forEach((k, i) => {
      const a = b.giro + (i / b.forma.length) * Math.PI * 2;
      const px = x + Math.cos(a) * r * k;
      const py = y + Math.sin(a) * r * k * 0.8;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
  }

  function quadro(agora: number) {
    if (fim) return;
    const t = Math.min((agora - t0) / DUR, 1);
    const zoom = 1 + 9 * (1 - easeInOut(Math.min(Math.max((t - 0.05) / 0.68, 0), 1)));
    const c = centro();
    const escala = Math.min(W, H * 1.6) * 0.5 * zoom;
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#070504";
    ctx.fillRect(0, 0, W, H);
    for (const b of brasas) {
      const vida = (t - b.acende) / 0.12;
      if (vida <= 0) continue;
      const liga = Math.min(vida, 1);
      const pisca = 0.78 + 0.22 * Math.sin((agora / 1000) * b.vel + b.fase);
      const calor = liga * pisca;
      const x = c.x + b.x * escala;
      const y = c.y + b.y * escala;
      const r = Math.max(b.r * escala, 0.8);
      if (x < -r * 3 || x > W + r * 3 || y < -r * 3 || y > H + r * 3) continue;
      // brilho em volta da pedra
      ctx.globalCompositeOperation = "lighter";
      const halo = ctx.createRadialGradient(x, y, r * 0.3, x, y, r * 2.2);
      halo.addColorStop(0, cor(calor * 0.8, 0.42 * liga));
      halo.addColorStop(1, "rgba(120,20,0,0)");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(x, y, r * 2.2, 0, Math.PI * 2);
      ctx.fill();
      // a pedra: escura nas bordas, em brasa no miolo
      ctx.globalCompositeOperation = "source-over";
      const corpo = ctx.createRadialGradient(x, y, 0, x, y, r);
      corpo.addColorStop(0, cor(calor, 0.95 * liga));
      corpo.addColorStop(
        0.55,
        `rgba(${Math.round(120 + calor * 80)},${Math.round(28 + calor * 22)},8,${liga})`,
      );
      corpo.addColorStop(1, `rgba(28,16,12,${liga})`);
      ctx.fillStyle = corpo;
      pedra(b, x, y, r);
      ctx.fill();
      if (rnd() < 0.01 * liga && faiscas.length < 120)
        faiscas.push({
          x,
          y,
          vx: (rnd() - 0.5) * 0.6,
          vy: -0.6 - rnd() * 1.6,
          vida: 0,
          max: 50 + rnd() * 60,
        });
    }
    ctx.globalCompositeOperation = "lighter";
    for (let i = faiscas.length - 1; i >= 0; i--) {
      const f = faiscas[i];
      f.vida++;
      f.x += f.vx + Math.sin(f.vida / 9) * 0.3;
      f.y += f.vy;
      const a = 1 - f.vida / f.max;
      if (a <= 0) {
        faiscas.splice(i, 1);
        continue;
      }
      ctx.fillStyle = cor(0.9, a);
      ctx.fillRect(f.x, f.y, 1.8, 1.8);
    }
    if (!revelou && t > 0.7) {
      revelou = true;
      revelar();
    }
    if (t < 1 || faiscas.length) requestAnimationFrame(quadro);
  }

  function revelar() {
    const c = centro();
    img.style.transformOrigin = `${(c.x / W) * 100}% ${(c.y / H) * 100}%`;
    img.animate(
      [
        { opacity: 0, transform: "scale(1.45)", filter: "blur(12px) brightness(0.6)" },
        { opacity: 1, transform: "scale(1)", filter: "blur(0) brightness(1)" },
      ],
      { duration: 1600, easing: EASE_OUT, fill: "forwards" },
    );
    img.style.opacity = "";
    canvas.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: 1100,
      delay: 500,
      easing: "ease",
      fill: "forwards",
    });
    textos.forEach((el, i) =>
      el.animate(
        [
          { opacity: 0, transform: "translateY(18px)" },
          { opacity: 1, transform: "none" },
        ],
        { duration: 800, delay: 900 + i * 90, easing: EASE_OUT, fill: "forwards" },
      ),
    );
    setTimeout(() => {
      fim = true;
      hero.classList.remove("onb-intro");
      hero.classList.add("onb-intro-fim");
      removeEventListener("resize", medir);
    }, 2400);
  }

  requestAnimationFrame(quadro);
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

// ---------- entradas suaves e barras fixas ----------

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

/** Barra "Kit Premium" (desktop) e dock de preço (celular): aparecem depois do topo, somem no resumo. */
export function barrasFixas(root: HTMLElement) {
  const resumo = root.querySelector(".onb-resumo")!;
  const dock = root.querySelector(".onb-dock")!;
  const barra = root.querySelector(".onb-barra-produto")!;
  const hero = root.querySelector(".onb-hero")!;
  let resumoVisivel = false;
  let heroVisivel = true;
  const atualizar = () => {
    dock.classList.toggle("on", !resumoVisivel && !heroVisivel);
    barra.classList.toggle("on", !heroVisivel);
  };
  new IntersectionObserver(([e]) => {
    resumoVisivel = e.isIntersecting;
    atualizar();
  }).observe(resumo);
  new IntersectionObserver(([e]) => {
    heroVisivel = e.isIntersecting;
    atualizar();
  }).observe(hero);
}
