// HTML de cada dobra da LP, na ordem da página. Nenhum link leva para fora da
// LP: o único caminho de saída é o carrinho (comprar) ou o WhatsApp (dúvida).
import { A_MAX, A_MIN, B_MAX, B_MIN } from "./builder";
import type { Ambiente, Instalacao } from "./configurador/palco/cena3d";
import {
  ACC_INFO,
  AMBIENTES,
  ANTES_DEPOIS,
  DESTAQUES,
  MAPS,
  PAR_ARQ,
  PROJETOS,
  REVIEWS,
  VIDEOS,
  VIDEOS_CLIENTE,
  type AccId,
} from "./conteudo";
import { CENAS, type Cena, type PassoId } from "./data/cenas";
import { esc, foto, IMG } from "./util";

const GOOGLE_G = `<svg viewBox="0 0 48 48" class="onb-g" aria-hidden="true"><path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"/><path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"/><path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"/><path fill="#EA4335" d="M24 9.5c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 2.97 29.93 1 24 1 15.4 1 7.96 5.93 4.34 13.12l7.35 5.7C13.42 13.37 18.27 9.5 24 9.5z"/></svg>`;

const ICONES = {
  cadeado: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V7a5 5 0 0 1 10 0v3" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="4.5" y="10" width="15" height="11" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="15.5" r="1.6" fill="currentColor"/></svg>`,
  cartao: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="5" width="19" height="14" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M2.5 9.5h19M6 15h4" stroke="currentColor" stroke-width="1.6"/></svg>`,
  escudo: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8 4.5 5.6v5.9c0 4.6 3.1 8.4 7.5 9.7 4.4-1.3 7.5-5.1 7.5-9.7V5.6z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="m8.5 12 2.4 2.4 4.6-4.8" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>`,
  caminhao: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 6.5h11v9h-11zM13.5 9.5h4l3 3.2v2.8h-7" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="7" cy="17.5" r="1.8" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="17" cy="17.5" r="1.8" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>`,
};

const botaoPlay = `<span class="onb-play" aria-hidden="true"></span>`;

export function topo() {
  return `
  <div class="onb-barra-produto">
    <div class="onb-barra-dentro">
      <strong>Kit Premium</strong>
      <span class="onb-barra-preco"></span>
      <button type="button" class="onb-btn-pq" data-ir-montador>Montar o meu</button>
    </div>
  </div>

  <section class="onb-hero onb-escuro" aria-label="Kit Premium em Inox">
    <div class="onb-hero-esq">
      <p class="onb-marca">Olho na Brasa</p>
      <h1>Kit Premium<br>em Inox.</h1>
      <p class="onb-prova"><span class="onb-estrelas" aria-hidden="true">★★★★★</span> +100 mil churrasqueiras entregues</p>
    </div>
    <div class="onb-hero-dir">
      <p>Feito na medida da sua churrasqueira.<br>15 anos de garantia.</p>
      <button type="button" class="onb-btn onb-btn-grande" data-ir-montador>Monte o seu em 3D</button>
    </div>
    <div class="onb-hero-midia">
      <picture>
        <source media="(max-width:767px)" srcset="${IMG}hero-poster-mobile.avif" type="image/avif">
        <source media="(max-width:767px)" srcset="${IMG}hero-poster-mobile.webp" type="image/webp">
        <source media="(max-width:767px)" srcset="${IMG}hero-poster-mobile.jpg">
        <source srcset="${IMG}hero-poster-desktop.avif" type="image/avif">
        <source srcset="${IMG}hero-poster-desktop.webp" type="image/webp">
        <img class="onb-hero-poster" src="${IMG}hero-poster-desktop.jpg" alt="Kit Premium Olho na Brasa em inox no nicho de mármore, com picanha na grelha, espetos e grelha de descanso" width="1280" height="720" fetchpriority="high" decoding="async">
      </picture>
      <canvas class="onb-hero-canvas" aria-hidden="true"></canvas>
      <div class="onb-carregando" aria-hidden="true"><i></i></div>
      <button type="button" class="onb-hero-replay" hidden><span aria-hidden="true">↻</span> Ver a montagem de novo</button>
    </div>
  </section>`;
}

export function destaques() {
  return `
  <section class="onb-destaques onb-escuro" aria-labelledby="onb-dest-t">
    <div class="onb-dentro onb-dest-topo">
      <h2 id="onb-dest-t">Comece pelos destaques.</h2>
      <button type="button" class="onb-btn-link onb-dest-video" id="video-headline" data-abrir-video="video-headline">Assistir ao vídeo <span class="onb-ico-play" aria-hidden="true"></span></button>
    </div>
    <div class="onb-dest-trilho" tabindex="0" aria-roledescription="carrossel" aria-label="Destaques do kit em uso">
      ${DESTAQUES.map(
        (d, i) => `
      <article class="onb-dest-card${d.vertical ? " vertical" : ""}" aria-roledescription="slide" aria-label="${i + 1} de ${DESTAQUES.length}" style="--onb-poster:url('${IMG}dest-${d.id}.webp')">
        <video src="${IMG}dest-${d.id}.mp4" poster="${IMG}dest-${d.id}.webp" muted playsinline preload="none" aria-hidden="true"></video>
        <p class="onb-dest-txt"><strong>${d.titulo}</strong> ${d.texto}</p>
      </article>`,
      ).join("")}
    </div>
    <div class="onb-dest-ctrl">
      <div class="onb-dest-pontos" role="group" aria-label="Escolher destaque">
        ${DESTAQUES.map((d, i) => `<button type="button" data-dest="${i}" aria-label="${esc(d.titulo.replace(/\.$/, ""))}"${i === 0 ? ' aria-current="true"' : ""}><i></i></button>`).join("")}
      </div>
      <button type="button" class="onb-dest-play" data-dest-play aria-label="Pausar destaques"><span aria-hidden="true"></span></button>
    </div>
  </section>`;
}

export function antesDepois() {
  return `
  <section class="onb-ad onb-claro" aria-labelledby="onb-ad-t">
    <div class="onb-dentro">
      <p class="onb-eyebrow">Antes e depois</p>
      <h2 id="onb-ad-t" class="onb-sobe">Do jeito da<br><span>sua churrasqueira.</span></h2>
      <p class="onb-lede-claro onb-sobe">Suspenso ou cooktop, tijolo, granito ou inox. Arraste e veja a mesma churrasqueira antes e depois do Kit Premium.</p>
    </div>
    <div class="onb-ad-trilho" aria-label="Antes e depois de churrasqueiras com o Kit Premium">
      ${ANTES_DEPOIS.map((p) => {
        const [antes, depois] = PAR_ARQ[p.id];
        return `
      <article class="onb-ad-card">
        <div class="onb-ad-comp" style="--onb-corte:50%" data-ad>
          <img src="${IMG}${antes}.webp" alt="Antes: ${esc(p.titulo)}" loading="lazy" decoding="async" draggable="false">
          <img class="onb-ad-depois" src="${IMG}${depois}.webp" alt="Depois: ${esc(p.titulo)} com o Kit Premium" loading="lazy" decoding="async" draggable="false">
          <span class="onb-ad-rot antes">Antes</span><span class="onb-ad-rot depois">Depois</span>
          <span class="onb-ad-linha" aria-hidden="true"><i>‹ ›</i></span>
          <input class="onb-ad-range" type="range" min="2" max="98" value="50" aria-label="Comparar antes e depois: ${esc(p.titulo)}">
        </div>
        <h3>${p.titulo}</h3>
        <p>${p.texto}</p>
      </article>`;
      }).join("")}
    </div>
    <div class="onb-ad-pontos" aria-hidden="true">${ANTES_DEPOIS.map((_, i) => `<i${i === 0 ? ' class="on"' : ""}></i>`).join("")}</div>
  </section>`;
}

export type Inicial = {
  a: number;
  b: number;
  inst: Instalacao;
  amb: Ambiente;
  modo: "kit" | "pecas";
  m: { suporte: { on: boolean } };
};

// caixa em cm + régua; a letra é a mesma da cota sobre o 3D
const medidaAB = (nome: "a" | "b", rotulo: string, min: number, max: number, v: number) => `
    <div class="onb-campo">
      <label for="onb-${nome}"><b>${nome.toUpperCase()}</b> ${rotulo}</label>
      <div class="onb-calc">
        <span class="onb-calc-num"><input id="onb-${nome}" name="${nome}" type="number" inputmode="numeric" autocomplete="off" min="${min}" max="${max}" step="1" value="${v}" aria-describedby="onb-msg-${nome}"><em>cm</em></span>
        <input class="onb-calc-range" type="range" name="${nome}-range" min="${min}" max="${max}" step="1" value="${v}" aria-label="${rotulo}" data-par="${nome}">
      </div>
      <p class="onb-msg" id="onb-msg-${nome}" aria-live="polite"></p>
    </div>`;
const acc = (id: AccId) => `
    <article class="onb-acc" data-acc="${id}">
      ${foto(ACC_INFO[id].img, ACC_INFO[id].titulo, 500, 500)}
      <div class="onb-acc-txt"><strong>${ACC_INFO[id].titulo}</strong><small>${ACC_INFO[id].texto}</small><span class="onb-acc-preco" data-preco-acc="${id}"></span></div>
      <button type="button" class="onb-acc-btn" data-acc-toggle="${id}" aria-pressed="false"><span class="onb-acc-acao">Adicionar</span></button>
    </article>`;

/** O corpo de cada passo; a cena diz quais entram e em que ordem. */
function corpoDoPasso(id: PassoId, s: Inicial, cena: Cena) {
  switch (id) {
    case "instalacao":
      return `<div class="onb-modos" role="group" aria-label="Instalação">
            <button type="button" data-inst="suspenso" aria-pressed="${s.inst === "suspenso"}"><strong>Suspenso</strong><small>Parafusado no fundo. A boca fica livre.</small></button>
            <button type="button" data-inst="cooktop" aria-pressed="${s.inst === "cooktop"}"><strong>Cooktop</strong><small>Apoia na bancada. Sem furar nada.</small></button>
          </div>
          <p class="onb-ajuda">Muda as peças e o preço.</p>`;
    case "medidas":
      return `<div class="onb-medidas-grade">
            <div class="onb-campos">
              ${medidaAB("a", "Largura da boca", A_MIN, A_MAX, s.a)}
              ${medidaAB("b", "Comprimento interno", B_MIN, B_MAX, s.b)}
            </div>
            <figure class="onb-onde-medir">
              ${foto("como-medir", "Churrasqueira com a largura da boca marcada como A e o comprimento interno como B", 500, 500)}
              <figcaption>Meça a largura interna da boca, de parede a parede, sem contar a pedra.</figcaption>
            </figure>
          </div>
          <p class="onb-nota">Depois da compra, o time de projetistas confirma as medidas finas com você.</p>`;
    case "churrasqueira":
      return `<div class="onb-chips onb-chips-compactos" role="group" aria-label="Tipo de churrasqueira">
            ${AMBIENTES.filter((a) => cena.ambientes.includes(a.id))
              .map(
                (a) =>
                  `<button type="button" data-amb="${a.id}" aria-pressed="${s.amb === a.id}"><strong>${a.nome}</strong></button>`,
              )
              .join("")}
          </div>
          <p class="onb-ajuda">Só para você ver o kit no lugar. O preço não muda.</p>`;
    case "kit":
      return `<p class="onb-faixa"></p>
          <ul class="onb-kit-linhas" id="onb-conteudo"></ul>`;
    case "pecas":
      return `<div class="onb-pecas-lista" id="onb-conteudo"></div>
          <p class="onb-combo-nota" hidden></p>`;
    case "acessorios":
      return `<div class="onb-acc-lista">
            ${acc("giratorio")}${acc("cesto")}${acc("bandeja")}${acc("defumador")}
          </div>
          <p class="onb-combo-nota" hidden></p>`;
    case "resumo":
      return `<ul class="onb-resumo-linhas" data-resumo-linhas></ul>
          <p class="onb-total" aria-live="polite"><span class="v"></span><span class="d"></span></p>
          <p class="onb-prazo">Produção: até 10 dias úteis + frete</p>
          <p class="onb-selo">Inox 304 · 15 anos de garantia</p>
          <button type="button" class="onb-comprar">Comprar</button>
          <p class="onb-erro" role="alert" hidden></p>
          <p class="onb-miudas">Frete calculado com o seu CEP no carrinho · Pix, boleto ou cartão</p>
          <button type="button" class="onb-link-whats" data-whats>Falar no WhatsApp</button>`;
  }
}

/** Os cartões de passo de uma cena (o KitConfigurador remonta isto ao trocar de cena). */
export function painelMontador(s: Inicial, cena: Cena) {
  return cena.passos
    .map(
      ({ id, titulo }, i) => `
        <section class="onb-passo${id === "resumo" ? " onb-resumo" : ""}" id="onb-passo-${id}" aria-labelledby="onb-passo-${id}-t">
          <h3 class="onb-passo-t" id="onb-passo-${id}-t"><span>${i + 1}</span> ${titulo}</h3>
          ${corpoDoPasso(id, s, cena)}
        </section>`,
    )
    .join("");
}

export function montador(s: Inicial, cena: Cena) {
  return `
  <section class="onb-montador onb-escuro" id="onb-montador" aria-labelledby="onb-montador-t">
    <div class="onb-dentro onb-montador-topo">
      <p class="onb-eyebrow">${cena.eyebrow}</p>
      <h2 id="onb-montador-t">${cena.titulo}</h2>
      <div class="onb-segmento" role="group" aria-label="Como montar">
        ${Object.values(CENAS)
          .map(
            (c) =>
              `<button type="button" data-kit="${c.id}" aria-pressed="${c.id === cena.id}">${c.rotulo}</button>`,
          )
          .join("")}
      </div>
    </div>
    <div class="onb-builder">
      <div class="onb-palco">
        <div class="onb-stage">
          <canvas role="img" aria-label="Kit em 3D"></canvas>
          <div class="onb-fallback" aria-hidden="true"></div>
          <div class="onb-cotas" aria-hidden="true" hidden>
            <svg></svg>
            <span class="onb-cota" data-cota="a"><b>A</b><em></em></span>
            <span class="onb-cota" data-cota="b"><b>B</b><em></em></span>
          </div>
          <div class="onb-pop" role="dialog" aria-label="Peça escolhida" hidden></div>
          <div class="onb-carregando" aria-hidden="true"><i></i></div>
          <span class="onb-palco-dica" hidden>Arraste para girar · toque nas peças</span>
          <code class="onb-fps"></code>
        </div>
        <p class="onb-palco-legenda" aria-live="polite"></p>
      </div>

      <div class="onb-painel">${painelMontador(s, cena)}
      </div>
    </div>
  </section>`;
}

export function acabamento() {
  return `
  <section class="onb-acab onb-escuro" aria-labelledby="onb-acab-t">
    <figure class="onb-acab-foto" aria-hidden="true">${foto("nicho-gourmet", "", 1600, 1067)}</figure>
    <div class="onb-dentro onb-acab-txt">
      <p class="onb-eyebrow onb-sobe">Acabamento</p>
      <h2 id="onb-acab-t" class="onb-sobe">Seis polimentos.<br><span>O brilho da foto chega na sua casa.</span></h2>
      <ul class="onb-acab-lista">
        <li class="onb-sobe"><b>6</b><span>processos de polimento até o espelhado</span></li>
        <li class="onb-sobe"><b>Solda invisível</b><span>sem emenda aparente para juntar sujeira</span></li>
        <li class="onb-sobe"><b>Alto brilho</b><span>nos cabos, com isolamento térmico</span></li>
        <li class="onb-sobe"><b>Inox 304</b><span>não enferruja nem com maresia</span></li>
      </ul>
      <blockquote class="onb-citacao onb-sobe"><p>“São seis processos de polimento para chegar nesse padrão de acabamento.”</p><cite>Rodrigo, Olho na Brasa</cite></blockquote>
    </div>
  </section>`;
}

export function garantia() {
  return `
  <section class="onb-garantia onb-escuro" aria-labelledby="onb-garantia-t">
    <div class="onb-dentro onb-gar-grade">
      <div class="onb-gar-video onb-sobe">
        <button type="button" class="onb-video" data-video="${IMG}garantia-15anos.mp4" data-poster="${IMG}garantia-15anos.webp" aria-label="Assistir: três motivos dos 15 anos de garantia">${foto("garantia-15anos", "", 720, 1280)}${botaoPlay}</button>
      </div>
      <div class="onb-gar-txt">
        <p class="onb-garantia-num onb-sobe" aria-hidden="true">15</p>
        <h2 id="onb-garantia-t" class="onb-sobe">Anos de garantia.<br><span>Três motivos.</span></h2>
        <ol class="onb-motivos">
          <li class="onb-sobe"><b>Inox 304.</b> Não enferruja e é muito fácil de limpar.</li>
          <li class="onb-sobe"><b>Fabricação própria.</b> Mais controle de qualidade: os testes garantem 5 kg de carne em cada espeto e 8 kg em cada grelha.</li>
          <li class="onb-sobe"><b>Pioneira.</b> A marca que abriu o mercado de acessórios em inox 304.</li>
        </ol>
      </div>
    </div>
  </section>`;
}

export function acessorios() {
  const card = (id: AccId, img: string, alt: string, titulo: string, texto: string) => `
    <article class="onb-acc-card onb-sobe">
      ${foto(img, alt, 500, 500)}
      <div><h3>${titulo}</h3><p>${texto}</p>
      <button type="button" class="onb-btn-sec" data-acc-toggle="${id}" aria-pressed="false"><span class="onb-acc-acao">Adicionar ao kit</span> <span class="onb-acc-preco" data-preco-acc="${id}"></span></button></div>
    </article>`;
  return `
  <section class="onb-acessorios onb-claro" aria-labelledby="onb-acc-t">
    <div class="onb-dentro">
      <h2 id="onb-acc-t" class="onb-sobe">Para quem leva<br><span>o churrasco a sério.</span></h2>
      <div class="onb-acc-grade">
        <article class="onb-acc-card onb-acc-largo onb-sobe">
          ${foto("cooktop-giratorio", "Cesto de miúdos girando com o motor sobre a brasa, em kit cooktop de inox", 1200, 1600)}
          <div><p class="onb-eyebrow">Combo</p><h3>Kit espeto giratório<br>+ cesto de miúdos.</h3><p>O motor gira o cesto sozinho enquanto você cuida do resto. Levando os dois juntos, sai pelo preço do combo.</p>
          <button type="button" class="onb-btn-sec" data-combo aria-pressed="false"><span class="onb-acc-acao">Adicionar o combo</span> <span class="onb-acc-preco" data-preco-combo></span></button></div>
        </article>
        ${card("giratorio", "peca-giratorio", "Kit espeto giratório com garfo de três pontas e motor", "Kit espeto giratório.", ACC_INFO.giratorio.texto)}
        ${card("cesto", "cesto-coracao", "Cesto de miúdos aberto, cheio de corações temperados", "Cesto de miúdos.", ACC_INFO.cesto.texto)}
        ${card("bandeja", "bandeja-coracao", "Bandeja perfurada de inox presa a um espeto de duas pontas", "Bandeja de coração.", ACC_INFO.bandeja.texto)}
        ${card("defumador", "peca-defumador", "Defumador de inox perfurado com lascas de madeira", "Defumador.", ACC_INFO.defumador.texto)}
      </div>
    </div>
  </section>`;
}

const chevron = (d: string) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/** Setas para quem está no computador e não tem como arrastar o carrossel (só aparecem com mouse). */
const setas = (item: string) => `
    <div class="onb-dentro onb-setas" data-setas>
      <button type="button" data-seta="-1" aria-label="${item} anterior">${chevron("M15 5l-7 7 7 7")}</button>
      <button type="button" data-seta="1" aria-label="Próximo ${item}">${chevron("M9 5l7 7-7 7")}</button>
    </div>`;

export function projetos() {
  return `
  <section class="onb-projetos onb-escuro" aria-labelledby="onb-proj-t">
    <div class="onb-dentro">
      <h2 id="onb-proj-t" class="onb-sobe">Projetos que viram<br><span>assunto no churrasco.</span></h2>
      <p class="onb-lede-escuro onb-sobe">Cinco churrasqueiras diferentes. O mesmo kit, feito sob medida para cada uma.</p>
    </div>
    <div class="onb-proj-trilho" aria-label="Projetos entregues">
      ${PROJETOS.map(
        (p) => `
      <article class="onb-proj-card">
        <figure>${foto(p.img, p.titulo.replace(/\.$/, ""), p.w, p.h)}</figure>
        <div class="onb-proj-txt">
          <ul class="onb-proj-tags">${p.tags.map((t) => `<li>${t}</li>`).join("")}</ul>
          <h3>${p.titulo}</h3>
          <p>${p.texto}</p>
        </div>
      </article>`,
      ).join("")}
    </div>
    ${setas("projeto")}
    <div class="onb-dentro onb-proj-cta onb-sobe">
      <p><b>Sua churrasqueira é diferente?</b> A fábrica faz o kit e o revestimento em inox sob medida para o seu projeto.</p>
      <button type="button" class="onb-btn-sec onb-btn-sec-claro" data-whats>Falar com a fábrica</button>
    </div>
  </section>`;
}

export function videosClientes() {
  return `
  <section class="onb-videos-sec onb-escuro" aria-labelledby="onb-vid-t">
    <div class="onb-dentro">
      <h2 id="onb-vid-t" class="onb-sobe">Veja a opinião de<br><span>quem já comprou.</span></h2>
      <div class="onb-videos">
        ${VIDEOS.map(
          ([v, p, legenda]) =>
            `<figure class="onb-sobe"><button type="button" class="onb-video" data-video="${VIDEOS_CLIENTE}${v}" data-poster="${VIDEOS_CLIENTE}${p}" aria-label="Assistir: ${legenda}"><img src="${VIDEOS_CLIENTE}${p}" alt="" loading="lazy" decoding="async" width="360" height="640">${botaoPlay}</button><figcaption>${legenda}</figcaption></figure>`,
        ).join("")}
      </div>
    </div>
  </section>`;
}

export function avaliacoes() {
  return `
  <section class="onb-reviews onb-escuro" aria-labelledby="onb-rev-t">
    <div class="onb-dentro">
      <p class="onb-eyebrow onb-centro">Avaliações no Google</p>
      <h2 id="onb-rev-t" class="onb-centro">O que nossos clientes<br><span>dizem no Google.</span></h2>
      <div class="onb-rev-resumo">
        <div class="onb-rev-g">${GOOGLE_G}<span>Google</span></div>
        <div class="onb-rev-nota"><span class="onb-rev-estrelas" aria-label="4,7 de 5 estrelas"><i style="--p:94%"></i></span></div>
        <p>41 avaliações</p>
        <a href="${MAPS}" target="_blank" rel="noopener">Ver todas no Google Maps ›</a>
      </div>
    </div>
    <div class="onb-rev-trilho" aria-label="Avaliações de clientes">
      ${REVIEWS.map(
        (r) => `
      <article class="onb-rev-card">
        <header>${GOOGLE_G}<span class="onb-rev-cinco" aria-label="5 estrelas">★★★★★</span></header>
        <p>“${r.quote}”</p>
        <cite>${r.author}</cite>
      </article>`,
      ).join("")}
    </div>
  </section>`;
}

export function perguntas() {
  return `
  <section class="onb-faq onb-claro" aria-labelledby="onb-faq-t">
    <div class="onb-dentro onb-estreito">
      <h2 id="onb-faq-t">Perguntas rápidas.</h2>
      <details><summary>Qual a diferença entre suspenso e cooktop?</summary><p>O suspenso é parafusado na parede do fundo e deixa a boca livre. O cooktop tem uma base sob medida que apoia na bancada, em volta do braseiro, e não precisa furar nada. Grelhas e espetos são os mesmos.</p></details>
      <details><summary>Precisa de obra para instalar?</summary><p>Não. O suspenso vai com quatro furos, buchas e parafusos; o cooktop só encaixa. Em uma tarde está pronto.</p></details>
      <details><summary>Minha medida não é redonda. E agora?</summary><p>O kit é feito em faixas de 5 em 5 cm e arredonda para baixo, para caber com folga. A sua medida exata vai no pedido e o time de projetistas confirma com você antes de fabricar.</p></details>
      <details><summary>Posso misturar grelha uruguaia e argentina?</summary><p>Pode. Em "Peça por peça", adicione cada tipo de grelha e de espeto que quiser. O 3D mostra exatamente o que vai.</p></details>
      <details><summary>Já tenho suporte. Posso comprar só grelhas?</summary><p>Pode. Em "Peça por peça", desmarque o suporte e escolha só o que falta.</p></details>
      <details><summary>Como fica o frete?</summary><p>Você vê valor e prazo no carrinho, com o seu CEP, antes de pagar. Sul e Sudeste têm frete grátis.</p></details>
    </div>
  </section>`;
}

export function fechamento() {
  return `
  <section class="onb-final onb-escuro" aria-labelledby="onb-final-t">
    <figure class="onb-final-foto" aria-hidden="true">${foto("kit-frente", "", 2000, 1802)}</figure>
    <div class="onb-dentro onb-final-txt onb-sobe">
      <h2 id="onb-final-t">Sua churrasqueira merece.</h2>
      <p>Monte o seu em 3D, na medida certa, e receba pronto para o primeiro fogo.</p>
      <div class="onb-ctas">
        <button type="button" class="onb-btn" data-ir-montador>Montar meu kit</button>
        <button type="button" class="onb-btn-link" data-whats>Falar com a fábrica ›</button>
      </div>
    </div>
  </section>`;
}

export function rodape() {
  return `
  <footer class="onb-rodape" aria-label="Olho na Brasa">
    <div class="onb-dentro">
      <ul class="onb-selos">
        <li>${ICONES.cadeado}<span><b>Compra segura</b>Checkout da loja oficial</span></li>
        <li>${ICONES.cartao}<span><b>Até 10x sem juros</b>Pix, boleto ou cartão</span></li>
        <li>${ICONES.escudo}<span><b>Garantia de 15 anos</b>Por escrito, direto da fábrica</span></li>
        <li>${ICONES.caminhao}<span><b>Entrega nacional</b>Grátis no Sul e Sudeste</span></li>
      </ul>
      <div class="onb-rodape-base">
        <p class="onb-rodape-marca">Olho na Brasa</p>
        <p>Atendimento de segunda a sexta, das 9h às 18h. <button type="button" class="onb-link-whats" data-whats>Falar no WhatsApp</button></p>
        <p class="onb-legal">Preços e estoque válidos no carrinho. Vendas sujeitas a análise de crédito e confirmação de dados.<br>OLHO NA BRASA · CNPJ 43.062.681/0001-25 · Itapema, SC</p>
      </div>
    </div>
  </footer>`;
}

export function modalVideo() {
  return `
  <dialog class="onb-modal" aria-label="Vídeo">
    <div class="onb-modal-corpo">
      <button type="button" class="onb-modal-fechar" data-fechar-modal aria-label="Fechar vídeo">×</button>
      <video playsinline controls preload="none"></video>
    </div>
  </dialog>

  <div class="onb-dock">
    <div class="onb-dock-resumo" id="onb-dock-resumo">
      <ul class="onb-resumo-linhas" data-resumo-linhas></ul>
      <p class="onb-miudas">Inox 304 · 15 anos de garantia · Frete calculado com o seu CEP no carrinho</p>
    </div>
    <div class="onb-dock-barra">
      <button type="button" class="onb-dock-preco" aria-expanded="false" aria-controls="onb-dock-resumo"><span class="v"></span><span class="d"></span></button>
      <button type="button" class="onb-comprar">Comprar</button>
    </div>
  </div>`;
}
