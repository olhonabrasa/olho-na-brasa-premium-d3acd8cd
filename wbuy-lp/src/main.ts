// LP de campanha "Monte seu kit" para rodar dentro de uma página de conteúdo
// da Wbuy (olhonabrasa.com.br/m/<slug>/). Procura <div id="onb-kit-lp"> e
// desenha tudo ali dentro. O 3D só baixa quando o montador chega perto da tela.
// Este arquivo só liga as partes: as dobras estão em dobras.ts e interacoes.ts,
// o montador em configurador/ (um arquivo por passo, o palco em configurador/palco/), o 3D do topo
// em hero3d.ts.
import css from "./styles.css?inline";
import { cenaDaUrl, estadoInicial, KitConfigurador } from "./configurador";
import * as D from "./dobras";
import { heroTresD } from "./hero3d";
import {
  antesDepois,
  barrasFixas,
  carrosselDestaques,
  modalDeVideo,
  setasCarrossel,
  videosNaHora,
} from "./interacoes";
import { entradasSuaves } from "./motion/entradas";
import { reduzMovimento } from "./motion/reduzido";
import { IMG } from "./util";

function iniciar(root: HTMLElement) {
  const params = new URLSearchParams(location.search);
  const cena = cenaDaUrl(params);
  const s = estadoInicial(params, cena);
  const reduzido = reduzMovimento();

  root.innerHTML = [
    D.topo(),
    D.destaques(),
    D.antesDepois(),
    D.montador(s, cena),
    D.acabamento(),
    D.garantia(),
    D.acessorios(),
    D.projetos(),
    D.videosClientes(),
    D.avaliacoes(),
    D.perguntas(),
    D.fechamento(),
    D.rodape(),
    D.modalVideo(),
  ].join("");
  root.classList.add("onb-pronto");

  // ---------- dobras ----------
  heroTresD(root, reduzido);
  const destaques = carrosselDestaques(root, reduzido);
  antesDepois(root);
  setasCarrossel(root);
  modalDeVideo(root, (aberto) => destaques.pausar(aberto));
  videosNaHora(root);
  entradasSuaves(root, reduzido);
  barrasFixas(root);

  // ---------- montador ----------
  KitConfigurador(root, s, cena, { reduzido, params });
}

const raiz = document.getElementById("onb-kit-lp");
if (raiz && !raiz.classList.contains("onb-pronto")) {
  // o pôster do topo é o LCP: pede antes do CSS e do resto da página (o <picture> escolhe o mesmo arquivo)
  for (const [media, nome] of [
    ["(max-width:767px)", "hero-poster-mobile"],
    ["(min-width:768px)", "hero-poster-desktop"],
  ]) {
    const pre = document.createElement("link");
    pre.rel = "preload";
    pre.as = "image";
    pre.type = "image/avif";
    pre.media = media;
    pre.href = `${IMG}${nome}.avif`;
    pre.setAttribute("fetchpriority", "high");
    document.head.append(pre);
  }
  const estilo = document.createElement("style");
  estilo.id = "onb-kit-lp-css";
  estilo.textContent = css;
  document.head.appendChild(estilo);
  // a fonte vem daqui: o editor da Wbuy remove <link> e o @import colado na página não carrega
  if (!document.querySelector('link[href*="family=Inter"]')) {
    const pre = document.createElement("link");
    pre.rel = "preconnect";
    pre.href = "https://fonts.gstatic.com";
    pre.crossOrigin = "anonymous";
    const fonte = document.createElement("link");
    fonte.rel = "stylesheet";
    fonte.href =
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap";
    document.head.append(pre, fonte);
  }
  // marca a página para o CSS esconder o topo, as faixas e o rodapé da loja
  document.documentElement.classList.add("onb-lp-ativa");
  iniciar(raiz);
}
