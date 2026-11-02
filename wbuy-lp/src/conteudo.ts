// Textos e dados da LP. Cada frase tem um trabalho: tirar uma dúvida que trava
// a compra ou dar um motivo concreto para comprar agora. Números e fatos vêm
// das páginas de produto da loja, das falas do Rodrigo nos vídeos e das
// avaliações reais do Google (LP Premium).
import type { Grupo } from "./builder";
import type { Acessorios, Ambiente } from "./configurador/palco/cena3d";

export type AccId = keyof Acessorios;

export const WHATS = "https://wa.me/554740420956";
export const MAPS =
  "https://www.google.com/maps/place/Olho+na+Brasa/@-27.1016701,-48.6187495,738m/data=!3m1!1e3!4m8!3m7!1s0x94d8b100c4230f17:0x899b6cbbbfaceb99!8m2!3d-27.1016701!4d-48.6161746!9m1!1b1!16s%2Fg%2F11rzr1kln5";
export const VIDEOS_CLIENTE = "https://olho-na-brasa-premium.lovable.app/__l5e/assets-v1/";

/** Cartões do montador (passo 4, peça por peça). */
export const INFO: Record<Grupo, { titulo: string; sub: string; img: string }> = {
  suporte: {
    titulo: "Suporte suspenso",
    sub: "Três níveis de altura onde tudo encaixa. Fixa com quatro furos, buchas e parafusos.",
    img: "peca-suporte",
  },
  grelhas: {
    titulo: "Grelhas",
    sub: "Misture os tipos. Uruguaia com quadro de 8 mm e varões de 5 mm. Argentina com canaletas em V e coletor de gordura.",
    img: "peca-uruguaia",
  },
  descanso: {
    titulo: "Grelha auxiliar",
    sub: "No nível de cima, segura a carne pronta quente sem passar do ponto.",
    img: "peca-descanso",
  },
  espetos: {
    titulo: "Espetos",
    sub: "Misture os tipos. Testados com 5 kg de carne cada um.",
    img: "peca-duplo",
  },
};

export const GRELHA_INFO = {
  uruguaia: { nome: "Uruguaia", img: "peca-uruguaia", nota: "Varões em V · testada com 8 kg" },
  argentina: {
    nome: "Argentina",
    img: "peca-argentina",
    nota: "Canaletas em V · coletor de gordura",
  },
} as const;

export const ESPETO_INFO = {
  espeto_duplo: { nome: "Duplo", img: "peca-duplo", nota: "A peça não gira" },
  espeto_chata: { nome: "Barra chata", img: "peca-chata", nota: "Para cortes grandes" },
  espeto_v: { nome: "V", img: "peca-v", nota: "Linguiça e coração" },
} as const;

export const AMBIENTES: { id: Ambiente; nome: string; sub: string }[] = [
  { id: "fechada", nome: "Fechada", sub: "Alvenaria tradicional" },
  { id: "lateral", nome: "Abertura lateral", sub: "Com vidro de um lado" },
  { id: "bancada", nome: "Bancada", sub: "Braseiro embutido" },
  { id: "gourmet", nome: "Nicho gourmet", sub: "Granito e inox" },
  { id: "estudio", nome: "Só o kit", sub: "Sem churrasqueira" },
];

export const ACC_INFO: Record<AccId, { titulo: string; texto: string; img: string }> = {
  giratorio: {
    titulo: "Kit espeto giratório",
    texto: "Motor a pilha que gira a carne sozinho. Cerca de 60 horas com 4 pilhas AA, sem tomada.",
    img: "peca-giratorio",
  },
  cesto: {
    titulo: "Cesto de miúdos",
    texto: "Coração, linguicinha e queijo assam por igual, sem cair na brasa.",
    img: "cesto-miudos",
  },
  bandeja: {
    titulo: "Bandeja de coração",
    texto: "Chapa perfurada no espeto. Coração dourado sem espetar um por um.",
    img: "bandeja-coracao",
  },
  defumador: {
    titulo: "Defumador",
    texto: "O aroma da madeira no churrasco de carvão. Vai direto sobre a brasa.",
    img: "peca-defumador",
  },
};

/** Pílulas do 3D (estilo "Design" da Apple): cada uma acende um grupo de peças. */
export const PILULAS: { id: string; nome: string; texto: string; partes: string[] }[] = [
  {
    id: "medidas",
    nome: "Onde medir",
    texto:
      "A é a largura da boca, de parede a parede. B é o comprimento interno, da boca até o fundo.",
    partes: [],
  },
  {
    id: "suporte",
    nome: "Suporte suspenso",
    texto: "Três alturas de brasa num suporte só. Sob encomenda, com quatro ou cinco níveis.",
    partes: ["suporte", "cooktop_base"],
  },
  {
    id: "grelhas",
    nome: "Grelhas",
    texto:
      "Uruguaia testada com até 8 kg. Argentina com canaletas que levam a gordura para o coletor.",
    partes: ["grelha_uruguaia", "grelha_argentina"],
  },
  {
    id: "espetos",
    nome: "Espetos",
    texto: "Duplo, barra chata ou V, com cabos de alto brilho. Cada espeto aguenta 5 kg de carne.",
    partes: ["espeto_", "acc_giratorio"],
  },
  {
    id: "descanso",
    nome: "Grelha auxiliar",
    texto: "No nível de cima, mantém a carne pronta quente sem passar do ponto.",
    partes: ["grelha_descanso"],
  },
  {
    id: "acabamento",
    nome: "Inox 304",
    texto: "Solda invisível e seis processos de polimento. Não enferruja nem com maresia.",
    partes: ["suporte", "grelha_", "espeto_", "acc_"],
  },
];

/** Destaques (carrossel de vídeos curtos). "vertical" = vídeo em pé, mostrado de lado. */
export const DESTAQUES: { id: string; titulo: string; texto: string; vertical?: boolean }[] = [
  {
    id: "pecas-1",
    titulo: "Três alturas de brasa.",
    texto:
      "Suporte suspenso, espeto giratório e espeto duplo trabalhando juntos, cada um no seu nível.",
  },
  {
    id: "pecas-2",
    titulo: "Grelhas para churrasco de verdade.",
    texto: "Uruguaia testada com até 8 kg e grelha auxiliar segurando o ponto lá em cima.",
  },
  {
    id: "altura",
    titulo: "Muda de altura com a brasa acesa.",
    texto:
      "Levanta e encaixa no nível de cima. Sem tirar nada para fora e sem pingar gordura no chão.",
    vertical: true,
  },
  {
    id: "instalacao",
    titulo: "Instalado em uma tarde.",
    texto: "Quatro furos, buchas e parafusos. Sem obra, sem quebrar a churrasqueira.",
    vertical: true,
  },
];

/** Antes e depois (mesmas fotos da LP Premium). */
export const ANTES_DEPOIS = [
  {
    id: "card5",
    titulo: "Tijolo refratário.",
    texto: "Saiu o ferro enferrujado. Entrou o suporte suspenso em inox espelhado.",
  },
  {
    id: "novo",
    titulo: "Granito.",
    texto: "Grelhas velhas e suporte torto deram lugar ao Kit Premium completo.",
  },
  {
    id: "card1",
    titulo: "Alvenaria nova.",
    texto: "A churrasqueira saiu da obra vazia e ganhou o kit sob medida.",
  },
  {
    id: "card2",
    titulo: "Grelhas trocadas.",
    texto: "Mesma churrasqueira, agora com inox 304 e 15 anos de garantia.",
  },
  {
    id: "card3",
    titulo: "Da obra ao gourmet.",
    texto: "Braseiro cru transformado em cooktop com suporte, grelhas e espetos.",
  },
];
export const PAR_ARQ: Record<string, [string, string]> = {
  card5: ["ba-card5-antes", "ba-card5-depois"],
  novo: ["ba-antes-novo", "ba-depois-novo"],
  card1: ["ba-card1-antes", "ba-card1-depois"],
  card2: ["ba-card2-antes", "ba-card2-depois"],
  card3: ["ba-card3-antes", "ba-card3-depois"],
};

/** Projetos entregues: cada um mostra uma churrasqueira diferente. */
export const PROJETOS = [
  {
    img: "proj-cooktop",
    w: 1600,
    h: 1600,
    titulo: "Cooktop no braseiro.",
    texto:
      "Base sob medida que encaixa no braseiro de tijolo refratário. Nada parafusado na parede: o kit apoia na bancada e o fundo em inox fecha o projeto.",
    tags: ["Cooktop", "Revestimento inox"],
  },
  {
    img: "proj-firebox",
    w: 1286,
    h: 1336,
    titulo: "Parrilla com firebox.",
    texto:
      "Suporte parafusado na parede de tijolo aparente e firebox ao lado: a lenha queima separada e só a brasa vai para a grelha.",
    tags: ["Suspenso", "Firebox"],
  },
  {
    img: "proj-apartamento",
    w: 1400,
    h: 1712,
    titulo: "Compacta de apartamento.",
    texto:
      "Suporte fixado no fundo de uma churrasqueira de embutir, com revestimento interno em inox. O vão do braseiro fica livre para a brasa e para a limpeza.",
    tags: ["Suspenso", "Revestimento inox"],
  },
  {
    img: "nicho-lateral",
    w: 1280,
    h: 960,
    titulo: "Gourmet com vidro lateral.",
    texto:
      "Kit largo, revestimento em inox e fechamento lateral em vidro temperado: o fogo aparece de outro ângulo e o ambiente continua protegido.",
    tags: ["Suspenso", "Vidro lateral", "Revestimento inox"],
  },
  {
    img: "nicho-gourmet",
    w: 1600,
    h: 1067,
    titulo: "Granito e madeira.",
    texto:
      "Nicho em granito integrado à marcenaria, aberto para a bancada. Fundo em inox e o kit suspenso livre sobre o braseiro.",
    tags: ["Suspenso", "Lateral aberta", "Revestimento inox"],
  },
];

export const VIDEOS = [
  [
    "70b8fd32-44f4-41db-b3cc-db03b92ea129/video-cliente-1.mp4",
    "70362e66-6be1-400e-8690-d66115d34b0e/poster-cliente-1.jpg",
    "Kit instalado",
  ],
  [
    "130136b1-821e-4efb-8aa6-bf5adf20ac0f/video-cliente-2.mp4",
    "582c1dd7-9d4f-4fa8-bddf-d74a80a53615/poster-cliente-2.jpg",
    "Reação ao receber",
  ],
  [
    "6955bfb5-f929-4bdb-a19d-e26903cce8ab/video-cliente-4.mp4",
    "6ae0da39-5bfc-4960-b07b-ab12f8e142d9/poster-cliente-4.jpg",
    "Encaixe sob medida",
  ],
  [
    "da069deb-c758-4daa-b488-d23e8abbfb54/video-cliente-5.mp4",
    "b6419e92-cbed-4c73-aa32-5ddeaff1978e/poster-cliente-5.jpg",
    "Primeiro churrasco",
  ],
];

/** Avaliações reais do Google (as mesmas da LP Premium). */
export const REVIEWS = [
  {
    quote:
      "Excelente atendimento, material de primeira qualidade e ótimo acabamento. Entrega no prazo! Recomendo.",
    author: "Sérgio Saturnino",
  },
  {
    quote:
      "Produto de excelente qualidade, com um pré e pós venda excelentes. Entregam o que prometem. Customizam seu pedido e orientam com segurança na retirada das medidas e como fazer sua instalação. Empresa diferenciada.",
    author: "Luiz Carlos Crab",
  },
  {
    quote:
      "Adquiri o suporte suspenso para espetos e uma grelha de descanso. Atendimento na compra personalizado e ágil, informei as medidas da minha churrasqueira e logo recebi o link com os valores. Recebi em casa muito antes do prazo. Estou muito satisfeito. Excelente pós venda. Sensacional.",
    author: "Cliente Google",
  },
  {
    quote:
      "O atendimento foi excelente, a loja é muito completa, estou satisfeita com os acessórios, são muito resistentes e lindos!",
    author: "Valéria Orsatto",
  },
  {
    quote:
      "Ótimos produtos, facilitando o manuseio na hora de fazer o churrasco. A instalação também fácil de fazer, deixando a churrasqueira funcional e com uma quantidade menor de utensílios para suporte de grelhas e espetos.",
    author: "Celso Oliveira",
  },
  { quote: "Produto de extrema qualidade. Superou as expectativas.", author: "Diego Macedo" },
  {
    quote:
      "Produto de altíssima qualidade, atendimento excepcional, recomendo fortemente. Melhorou muito meus momentos de lazer na minha casa com esses acessórios para a churrasqueira.",
    author: "Cliente Google",
  },
];
