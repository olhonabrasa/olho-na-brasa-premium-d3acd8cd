import React, { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  Award,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Factory,
  Hammer,
  Image as ImageIcon,
  Lock,
  Maximize2,
  Search,
  ShieldCheck,
  ShoppingCart,
  Star,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { PhotoUpload } from "@/components/PhotoUpload";
import { WhatsappChatSimulado } from "@/components/WhatsappChatSimulado";
import { sendLeadToDataCrazy, markWhatsappClick, upsertLead } from "@/lib/sendLead";
import { cn } from "@/lib/utils";
import beforeProjectAsset from "@/assets/olho-na-brasa-antes-1.jpg.asset.json";
import afterProjectAsset from "@/assets/olho-na-brasa-depois-1.jpg.asset.json";
import processCutAsset from "@/assets/processo-corte-inox.jpg.asset.json";
import processWeldAsset from "@/assets/processo-solda-especializada.jpg.asset.json";
import processPolishAsset from "@/assets/processo-polimento.png.asset.json";
import processAssemblyAsset from "@/assets/processo-montagem.jpg.asset.json";
import processInspectionAsset from "@/assets/processo-inspecao-qualidade.jpg.asset.json";
import processPackagingAsset from "@/assets/processo-embalagem-segura.png.asset.json";
import videoHeadlineAsset from "@/assets/video-headline.mp4.asset.json";
import fabricaVideo from "@/assets/fabrica.mp4.asset.json";
import kitCompletoAsset from "@/assets/kit-completo.png.asset.json";
import suporteSuspensoAsset from "@/assets/suporte-suspenso.png.asset.json";

import card1Antes from "@/assets/card1-antes.jpg.asset.json";
import card1Depois from "@/assets/card1-depois.jpg.asset.json";
import card2Antes from "@/assets/card2-antes.jpg.asset.json";
import card2Depois from "@/assets/card2-depois.jpg.asset.json";
import card3Antes from "@/assets/card3-antes.jpg.asset.json";
import card3Depois from "@/assets/card3-depois.jpg.asset.json";
import projeto1 from "@/assets/projeto-instalado-1.jpg.asset.json";
import projeto2 from "@/assets/projeto-instalado-2.jpg.asset.json";
import projeto3 from "@/assets/projeto-instalado-3.jpg.asset.json";
import projeto4 from "@/assets/projeto-instalado-4.png.asset.json";
import projeto5 from "@/assets/projeto-instalado-5.jpg.asset.json";
import projeto6 from "@/assets/projeto-instalado-6.jpg.asset.json";
import rodrigoMedidasVideo from "@/assets/rodrigo-medidas.mp4.asset.json";
import logoOlhoNaBrasa from "@/assets/logo-olho-na-brasa.png.asset.json";
import card5Antes from "@/assets/card5-antes.png.asset.json";
import card5Depois from "@/assets/card5-depois.jpg.asset.json";
import antesNovo from "@/assets/antes-novo.jpeg.asset.json";
import depoisNovo from "@/assets/depois-novo.png.asset.json";
import kitRevestimento4 from "@/assets/kit-revestimento-4.png.asset.json";
import videoCliente1 from "@/assets/video-cliente-1.mp4.asset.json";
import videoCliente2 from "@/assets/video-cliente-2.mp4.asset.json";
import videoCliente3 from "@/assets/video-cliente-3.mp4.asset.json";
import videoCliente4 from "@/assets/video-cliente-4.mp4.asset.json";
import videoCliente5 from "@/assets/video-cliente-5.mp4.asset.json";
import posterCliente1 from "@/assets/poster-cliente-1.jpg.asset.json";
import posterCliente2 from "@/assets/poster-cliente-2.jpg.asset.json";
import posterCliente3 from "@/assets/poster-cliente-3.jpg.asset.json";
import posterCliente4 from "@/assets/poster-cliente-4.jpg.asset.json";
import posterCliente5 from "@/assets/poster-cliente-5.jpg.asset.json";
import { Play } from "lucide-react";

declare global {
  // eslint-disable-next-line no-var
  var fbq: ((...args: unknown[]) => void) | undefined;
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kit Premium para Churrasqueira | Inox 304 Sob Medida | Olho na Brasa" },
      {
        name: "description",
        content:
          "Grelha e kit completo em inox 304 para sua churrasqueira. Sob medida, direto da fábrica, com 15 anos de garantia. Frete grátis Sul e Sudeste.",
      },
      { property: "og:title", content: "Kit Premium para Churrasqueira | Inox 304 Sob Medida | Olho na Brasa" },
      {
        property: "og:description",
        content:
          "Grelha e kit completo em inox 304 para sua churrasqueira. Sob medida, direto da fábrica, com 15 anos de garantia.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/" },
      { property: "og:image", content: afterProjectAsset.url },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Kit Premium para Churrasqueira | Olho na Brasa" },
      {
        name: "twitter:description",
        content: "Projeto sob medida em inox 304, direto da fábrica com 15 anos de garantia.",
      },
      { name: "twitter:image", content: afterProjectAsset.url },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: LandingPage,
});

type ModalStage = "stage" | "projectType" | "photo" | "contact" | "path";
type ProjectMoment = "obra" | "pronta" | null;
type ProjectType = "kit" | "suporte" | null;

const projectMomentLabels: Record<NonNullable<ProjectMoment>, string> = {
  obra: "Estou construindo ou reformando minha churrasqueira",
  pronta: "Já tenho a churrasqueira pronta, só falta o kit",
};

type ContactForm = {
  name: string;
  whatsapp: string;
  city: string;
  state: string;
  email: string;
  photoUrl: string;
};

type RevealProps = {
  id?: string;
  className?: string;
  as?: keyof HTMLElementTagNameMap;
  children: ReactNode;
  style?: React.CSSProperties;
  glow?: boolean;
};

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  centered?: boolean;
};

type ProcessStep = { number: string; title: string; description: string; image: string; alt: string };
type GalleryItem = { title: string; location: string; image?: string; alt: string; featured?: boolean };
type BeforeAfterPair = {
  before: string;
  after: string;
  title: string;
  subtitle: string;
  beforeAlt: string;
  afterAlt: string;
};

const WHATSAPP_URL = "https://wa.me/554740420956";
const SITE_URL = "https://www.olhonabrasa.com.br";
const KITS_URL = "https://www.olhonabrasa.com.br/kits-premium/";
const INSTAGRAM_URL = "https://www.instagram.com/olhonabrasa/";

const processSteps: ProcessStep[] = [
  {
    number: "01",
    title: "Corte do Inox",
    description: "Chapas de Inox 304 cortadas com precisão milimétrica.",
    image: processCutAsset.url,
    alt: "Corte preciso de peças em inox 304 com faíscas na fábrica",
  },
  {
    number: "02",
    title: "Solda especializada",
    description: "Solda TIG por profissionais certificados. Acabamento limpo e resistente.",
    image: processWeldAsset.url,
    alt: "Solda especializada em estrutura de inox",
  },
  {
    number: "03",
    title: "Polimento",
    description: "Acabamento escovado premium. Brilho que dura anos sem desbotar.",
    image: processPolishAsset.url,
    alt: "Polimento do inox com acabamento premium",
  },
  {
    number: "04",
    title: "Montagem",
    description: "Cada peça é montada e testada manualmente antes da embalagem.",
    image: processAssemblyAsset.url,
    alt: "Montagem manual de estrutura em inox",
  },
  {
    number: "05",
    title: "Inspeção de qualidade",
    description: "Verificação final de medidas, acabamento e resistência.",
    image: processInspectionAsset.url,
    alt: "Equipe conferindo qualidade final do kit",
  },
  {
    number: "06",
    title: "Embalagem segura",
    description: "Embalagem reforçada para transporte. Seu kit chega intacto.",
    image: processPackagingAsset.url,
    alt: "Kit embalado com proteção reforçada",
  },
];

const beforeAfterPairs: BeforeAfterPair[] = [
  {
    before: card5Antes.url,
    after: card5Depois.url,
    title: "Churrasqueira de tijolo refratário, transformada com inox 304",
    subtitle: "Saiu o ferro enferrujado, entrou suporte suspenso premium com acabamento espelhado.",
    beforeAlt: "Churrasqueira de tijolo refratário com grelhas antigas enferrujadas",
    afterAlt: "Mesma churrasqueira com suporte suspenso Olho na Brasa em inox 304",
  },
  {
    before: antesNovo.url,
    after: depoisNovo.url,
    title: "Churrasqueira em granito, renovada com Kit Premium",
    subtitle: "Saiu o ferro velho enferrujado, entrou suporte suspenso e grelhas em inox 304 espelhado.",
    beforeAlt: "Churrasqueira em granito com grelhas e suportes enferrujados",
    afterAlt: "Mesma churrasqueira com Kit Premium Olho na Brasa em inox 304 instalado",
  },
  {
    before: card1Antes.url,
    after: card1Depois.url,
    title: "Churrasqueira de alvenaria, com Kit Premium instalado",
    subtitle: "Encaixe perfeito, acabamento espelhado e a percepção premium que só o inox 304 entrega.",
    beforeAlt: "Churrasqueira de alvenaria sem equipamento antes da instalação",
    afterAlt: "Churrasqueira com Kit Premium Olho na Brasa instalado",
  },
  {
    before: card2Antes.url,
    after: card2Depois.url,
    title: "Churrasqueira enferrujada, renovada com grelhas em inox",
    subtitle: "Saiu o ferro velho, entrou inox 304 alimentício com 15 anos de garantia.",
    beforeAlt: "Churrasqueira antiga com grelhas enferrujadas",
    afterAlt: "Mesma churrasqueira com grelhas novas em inox 304",
  },
  {
    before: card3Antes.url,
    after: card3Depois.url,
    title: "Churrasqueira de obra, equipada com suporte suspenso",
    subtitle: "Direto da obra para o padrão gourmet. Tudo sob medida.",
    beforeAlt: "Churrasqueira de obra crua, sem grelhas nem acessórios",
    afterAlt: "Kit completo Olho na Brasa com suporte suspenso instalado",
  },
];

const galleryItems: GalleryItem[] = [
  {
    title: "Acabamento espelhado",
    location: "Revestimento em pedra natural",
    image: kitRevestimento4.url,
    alt: "Kit Olho na Brasa instalado em churrasqueira com revestimento em pedra natural",
    featured: true,
  },
  {
    title: "Kit Premium em ação",
    location: "Carnes na brasa com suporte suspenso",
    image: projeto1.url,
    alt: "Kit premium em inox 304 com carnes assando",
    featured: true,
  },
  {
    title: "Acabamento espelhado",
    location: "Churrasqueira em mármore",
    image: projeto2.url,
    alt: "Kit Olho na Brasa instalado em churrasqueira com moldura em mármore",
  },
  {
    title: "Encaixe perfeito",
    location: "Churrasqueira em tijolo aparente",
    image: projeto3.url,
    alt: "Kit premium em inox instalado em churrasqueira de tijolo",
  },
  {
    title: "Projeto em pedra natural",
    location: "Área gourmet rústica",
    image: projeto4.url,
    alt: "Kit instalado em churrasqueira com revestimento em pedra natural",
  },
  {
    title: "Área gourmet contemporânea",
    location: "Bancada em granito",
    image: projeto5.url,
    alt: "Kit premium em área gourmet contemporânea",
  },
  {
    title: "Nicho premium",
    location: "Projeto residencial",
    image: projeto6.url,
    alt: "Kit instalado em nicho de churrasqueira residencial premium",
  },
];

const faqItems = [
  {
    question: "Como sei se o Kit vai caber na minha churrasqueira?",
    answer:
      "Todos os nossos kits são fabricados sob medida. Você informa as medidas internas da sua churrasqueira (largura e comprimento) e nós fabricamos no tamanho exato. Temos um vídeo com o Rodrigo, dono da fábrica, ensinando como tirar as medidas corretamente.",
  },
  {
    question: "O inox 304 realmente não enferruja?",
    answer:
      "O Inox 304 é o mesmo aço utilizado em equipamentos hospitalares e na indústria alimentícia. Ele resiste a maresia, chuva e uso intenso. Com o cuidado básico, vai durar décadas sem ferrugem, por isso garantimos por 15 anos.",
  },
  {
    question: "Quanto tempo demora a entrega?",
    answer:
      "Como cada kit é fabricado sob medida, o prazo de produção varia. Após a confirmação do pagamento, nosso time informa o prazo atualizado. Frete grátis para Sul e Sudeste.",
  },
  {
    question: "E se eu errar a medida?",
    answer:
      "Nosso time confere as medidas junto com você antes de iniciar a fabricação. Enviamos imagem e vídeo explicando exatamente onde medir.",
  },
  { question: "Posso parcelar?", answer: "Sim! Em até 10x sem juros no cartão. Também temos 5% de desconto no PIX." },
  {
    question: "Como funciona a garantia de 15 anos?",
    answer: "A garantia cobre defeitos de fabricação e falhas de material por 15 anos a partir da data de entrega.",
  },
  {
    question: "Vocês fazem instalação?",
    answer:
      "Sim! Para clientes da Grande Florianópolis e litoral catarinense, oferecemos serviço de instalação com equipe própria.",
  },
  {
    question: "O que inclui o Kit Premium?",
    answer:
      "Grelha Uruguaia Premium, Grelha de Descanso, Suporte Suspenso e Espetos. Tudo em Inox 304 alimentício, sob medida.",
  },
];

const benefits = [
  "Inox 304 alimentício",
  "Sob medida",
  "15 anos de garantia",
  "Produção Artesanal",
  "★★★★★ 100.000+ churrasqueiras entregues",
  "Acabamento premium",
];

type ClientVideo = { src: string; name: string; caption: string; poster: string };
const clientVideos: ClientVideo[] = [
  {
    src: videoCliente1.url,
    poster: posterCliente1.url,
    name: "Cliente Olho na Brasa",
    caption: "Kit Premium instalado",
  },
  {
    src: videoCliente2.url,
    poster: posterCliente2.url,
    name: "Cliente Olho na Brasa",
    caption: "Reação ao receber o kit",
  },
  {
    src: videoCliente3.url,
    poster: posterCliente3.url,
    name: "Cliente Olho na Brasa",
    caption: "Acabamento em inox 304",
  },
  { src: videoCliente4.url, poster: posterCliente4.url, name: "Cliente Olho na Brasa", caption: "Encaixe sob medida" },
  { src: videoCliente5.url, poster: posterCliente5.url, name: "Cliente Olho na Brasa", caption: "Primeiro churrasco" },
];

function LandingPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [modalStage, setModalStage] = useState<ModalStage>("stage");
  const [projectType, setProjectType] = useState<ProjectType>(null);
  const [projectMomentLabel, setProjectMomentLabel] = useState("");
  const [leadId, setLeadId] = useState<string | null>(null);
  const [headerVisible, setHeaderVisible] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{
    src: string;
    alt: string;
    title?: string;
    subtitle?: string;
  } | null>(null);
  const [contactForm, setContactForm] = useState<ContactForm>({
    name: "",
    whatsapp: "",
    city: "",
    state: "",
    email: "",
    photoUrl: "",
  });

  const buildLeadData = (overrides?: Partial<{ estagio: string; tipoProjeto: ProjectType }>) => ({
    nome: contactForm.name,
    whatsapp: contactForm.whatsapp,
    email: contactForm.email,
    cidade: contactForm.city,
    estado: contactForm.state.toUpperCase(),
    estagio: overrides?.estagio ?? projectMomentLabel,
    tipoProjeto:
      overrides?.tipoProjeto !== undefined
        ? overrides.tipoProjeto
          ? projectTypeLabels[overrides.tipoProjeto]
          : ""
        : projectType
          ? projectTypeLabels[projectType]
          : "",
    fotoUrl: contactForm.photoUrl,
  });

  const schemaMarkup = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "LocalBusiness",
          name: "Olho na Brasa",
          image: afterProjectAsset.url,
          telephone: "+55 47 4042-0956",
          url: SITE_URL,
          address: { "@type": "PostalAddress", addressRegion: "SC", addressCountry: "BR" },
          sameAs: [SITE_URL, INSTAGRAM_URL],
          description: "Fábrica de grelhas e acessórios premium em inox 304 sob medida para churrasqueiras.",
        },
        {
          "@type": "Product",
          name: "Kit Premium para Churrasqueira Olho na Brasa",
          brand: { "@type": "Brand", name: "Olho na Brasa" },
          image: [afterProjectAsset.url, beforeProjectAsset.url],
          description: "Kit premium em inox 304 alimentício, sob medida, com 15 anos de garantia.",
          url: KITS_URL,
        },
      ],
    }),
    [],
  );

  useEffect(() => {
    const onScroll = () => setHeaderVisible(window.scrollY > 300);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = modalOpen || chatOpen || lightboxImage ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [modalOpen, chatOpen, lightboxImage]);

  const openConsultiveModal = () => {
    setChatOpen(false);
    setModalOpen(true);
    setModalStage("stage");
    setProjectType(null);
    setProjectMomentLabel("");
    setLeadId(null);
  };

  const closeConsultiveModal = () => {
    setModalOpen(false);
    setModalStage("stage");
    setProjectType(null);
    setProjectMomentLabel("");
    setLeadId(null);
  };

  const openChatSimulado = () => {
    setModalOpen(false);
    setChatOpen(true);
  };

  const formattedWhatsapp = formatWhatsapp(contactForm.whatsapp);

  const cityState = contactForm.state ? `${contactForm.city}/${contactForm.state.toUpperCase()}` : contactForm.city;

  const specialistMessage = buildWhatsappMessage({
    intro: "Olá! Quero montar meu Kit Premium.",
    form: contactForm,
    projectType,
  });

  const measurementHelpMessage = buildWhatsappMessage({
    intro: "Olá! Quero montar meu Kit Premium, mas preciso de ajuda para definir as medidas da minha churrasqueira.",
    form: contactForm,
    projectType,
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaMarkup) }} />

      <div className="bg-background text-foreground">
        <PromoTopBar onOpenModal={openConsultiveModal} />
        <main>
          <HeroSection onOpenModal={openConsultiveModal} />
          <Divider />
          <DifferentialsSection />
          <Divider />
          <BeforeAfterSection onOpenModal={openConsultiveModal} onOpenLightbox={(img) => setLightboxImage(img)} />
          <Divider />
          <ProcessSection onOpenModal={openConsultiveModal} />
          <Divider />
          <GallerySection
            onOpenLightbox={(item) =>
              setLightboxImage({ src: item.image ?? "", alt: item.alt, title: item.title, subtitle: item.location })
            }
            onOpenModal={openConsultiveModal}
          />
          <Divider />
          <ClientVideosSection onOpenModal={openConsultiveModal} />
          <Divider />
          <GoogleReviewsSection onOpenModal={openConsultiveModal} />
          <Divider />
          <FaqSection onOpenModal={openConsultiveModal} />
          <Divider />
          <PromoBannerPais onOpenModal={openConsultiveModal} />
          <Divider />
          <FinalCtaSection onOpenModal={openConsultiveModal} />
        </main>

        <Footer />
        <FloatingWhatsappButton onOpenChat={openChatSimulado} />
      </div>

      <ConsultiveModal
        open={modalOpen}
        stage={modalStage}
        projectType={projectType}
        estagio={projectMomentLabel}
        form={contactForm}
        formattedWhatsapp={formattedWhatsapp}
        cityState={cityState}
        onClose={closeConsultiveModal}
        onMomentSelect={(moment) => {
          setProjectMomentLabel(projectMomentLabels[moment]);
          setModalStage("projectType");
        }}
        onProjectTypeSelect={(type) => {
          setProjectType(type);
          setModalStage("photo");
          void upsertLead(buildLeadData({ tipoProjeto: type }), "formulario", null).then((id) => {
            if (id) setLeadId(id);
          });
        }}
        onContinuePhoto={() => {
          setModalStage("contact");
          void upsertLead(buildLeadData(), "formulario", leadId).then((id) => {
            if (id && !leadId) setLeadId(id);
          });
        }}
        onContinueContact={() => {
          setModalStage("path");
          void upsertLead(buildLeadData(), "formulario", leadId).then((id) => {
            if (id && !leadId) setLeadId(id);
          });
        }}
        onFinalAction={async (url) => {
          const id = await upsertLead(buildLeadData(), "formulario", leadId, { clickedWhatsapp: true });
          if (id && !leadId) setLeadId(id);
          void sendLeadToDataCrazy(buildLeadData(), "formulario").catch(() => undefined);
          window.open(url, "_blank");
        }}
        onChangeField={(field, value) => setContactForm((current) => ({ ...current, [field]: value }))}
        specialistMessage={specialistMessage}
        measurementHelpMessage={measurementHelpMessage}
      />


      <WhatsappChatSimulado open={chatOpen} onClose={() => setChatOpen(false)} onSwitchToForm={openConsultiveModal} />

      {lightboxImage ? <Lightbox image={lightboxImage} onClose={() => setLightboxImage(null)} /> : null}
    </>
  );
}

function Divider() {
  return <hr className="section-divider" aria-hidden="true" />;
}

function StickyHeader({ visible }: { visible: boolean }) {
  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 h-14 border-b border-white/5 backdrop-blur-xl transition-transform duration-300",
        visible ? "translate-y-0" : "-translate-y-full",
      )}
      style={{ background: "rgb(10 10 10 / 0.9)" }}
    >
      <div className="header-sticky mx-auto flex h-full max-w-(--container-max) items-center justify-center gap-3 px-5">
        <a href="#top" aria-label="Olho na Brasa — Início" className="flex items-center gap-2">
          <img src={logoOlhoNaBrasa.url} alt="Olho na Brasa" className="header-logo h-8 w-auto md:h-9" />
        </a>
      </div>
    </header>
  );
}

/* ===================== HERO VIDEO ===================== */
function HeroVideo({ videoSrc }: { videoSrc: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [showSoundPrompt, setShowSoundPrompt] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.5 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  const handleActivateSound = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    video.volume = 1.0;
    setIsMuted(false);
    setShowSoundPrompt(false);
    video.play().catch(() => {});
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  return (
    <div
      className="hero-video-container relative w-full overflow-hidden bg-black cursor-pointer"
      onClick={showSoundPrompt ? handleActivateSound : undefined}
      style={{ aspectRatio: "4 / 3" }}
    >
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        src={videoSrc}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
        controlsList="nodownload noplaybackrate nofullscreen"
      />

      {showSoundPrompt && (
        <button
          type="button"
          onClick={handleActivateSound}
          aria-label="Ativar som"
          className="absolute left-1/2 top-1/2 z-10 flex items-center gap-3 rounded-full border border-white/40 bg-black/55 px-5 py-3 text-white backdrop-blur-md"
          style={{
            transform: "translate(-50%, -50%)",
            animation: "pulseSound 2s ease-in-out infinite",
          }}
        >
          <Volume2 className="h-5 w-5" />
          <span className="text-sm font-semibold uppercase tracking-wide">Toque para ativar o som</span>
        </button>
      )}

      {!showSoundPrompt && (
        <button
          type="button"
          onClick={toggleMute}
          aria-label={isMuted ? "Ativar som" : "Silenciar"}
          className="absolute bottom-4 right-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-black/55 text-white backdrop-blur-md hover:bg-black/70 transition-colors"
        >
          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
      )}

      <style>{`
        @keyframes pulseSound {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          50% { transform: translate(-50%, -50%) scale(1.06); opacity: 0.85; }
        }
      `}</style>
    </div>
  );
}

/* ===================== HERO ===================== */
function HeroSection({ onOpenModal: _onOpenModal }: { onOpenModal: () => void }) {
  return (
    <section id="top" className="hero-section relative overflow-hidden bg-background">
      <HeroVideo videoSrc={videoHeadlineAsset.url} />
      <div className="hero-content px-4 pb-6 pt-5">
        <h1
          className="hero-headline font-display text-foreground"
          style={{
            fontFamily: "Inter, sans-serif",
            fontWeight: 800,
            fontSize: "clamp(1.5rem, 6.5vw, 3.25rem)",
            lineHeight: 1.08,
            letterSpacing: "-0.03em",
          }}
        >
          O Kit de Churrasqueira <span style={{ color: "#FF6B00" }}>mais Vendido do Brasil!</span>
        </h1>

        <p
          className="hero-subtitle mt-2 text-secondary-foreground"
          style={{
            fontFamily: "Inter, sans-serif",
            fontWeight: 400,
            fontSize: "clamp(0.85rem, 3.2vw, 1.15rem)",
            lineHeight: 1.35,
            color: "#B0B0B0",
          }}
        >
          O Kit Suporte Suspenso da <span style={{ color: "#FFFFFF", fontWeight: 600 }}>Olho na Brasa</span>
        </p>

        <div className="mt-4 badges-marquee">
          <BenefitsMarquee />
        </div>
      </div>
    </section>
  );
}

/* ===================== BENEFITS MARQUEE ===================== */
function BenefitsMarquee() {
  const items = [...benefits, ...benefits];
  return (
    <div className="marquee-mask overflow-hidden">
      <div className="marquee-track flex gap-2 py-1">
        {items.map((item, idx) => (
          <span
            key={`${item}-${idx}`}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/15 bg-black/55 px-3 py-1.5 text-[11px] font-medium text-foreground backdrop-blur-md md:text-sm"
          >
            <Check className="h-3 w-3 shrink-0 text-primary" aria-hidden="true" />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ===================== ANTES/DEPOIS ===================== */
function BeforeAfterSlider({
  before,
  after,
  beforeAlt,
  afterAlt,
}: {
  before: string;
  after: string;
  beforeAlt: string;
  afterAlt: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pct, setPct] = useState(50);
  const dragging = useRef(false);

  const updateFromClient = (clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let next = ((clientX - rect.left) / rect.width) * 100;
    next = Math.max(2, Math.min(98, next));
    setPct(next);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    dragging.current = true;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    updateFromClient(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    updateFromClient(e.clientX);
  };
  const onPointerUp = () => {
    dragging.current = false;
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full select-none overflow-hidden rounded-xl border border-border bg-black"
      style={{ aspectRatio: "4 / 3", touchAction: "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <img
        src={before}
        alt={beforeAlt}
        className="absolute inset-0 h-full w-full object-cover"
        loading="lazy"
        draggable={false}
      />
      <img
        src={after}
        alt={afterAlt}
        className="absolute inset-0 h-full w-full object-cover"
        style={{ clipPath: `inset(0 0 0 ${pct}%)` }}
        loading="lazy"
        draggable={false}
      />
      <span className="absolute bottom-2 left-2 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-semibold tracking-[0.14em] text-white">
        ANTES
      </span>
      <span
        className="absolute bottom-2 right-2 rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-[0.14em] text-black"
        style={{ background: "#E8913A" }}
      >
        DEPOIS
      </span>
      <div
        className="pointer-events-none absolute top-0 bottom-0"
        style={{ left: `${pct}%`, width: "3px", background: "#E8913A", transform: "translateX(-1.5px)" }}
      >
        <div
          className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-full border-2 border-white px-2.5 py-1"
          style={{ background: "#E8913A" }}
        >
          <ChevronLeft className="h-4 w-4 text-black" strokeWidth={3} />
          <span className="text-[9px] font-bold uppercase tracking-wider text-black">arraste</span>
          <ChevronRight className="h-4 w-4 text-black" strokeWidth={3} />
        </div>
      </div>
    </div>
  );
}

function BeforeAfterSection({
  onOpenModal: _onOpenModal,
  onOpenLightbox: _onOpenLightbox,
}: {
  onOpenModal: () => void;
  onOpenLightbox: (img: { src: string; alt: string; title?: string; subtitle?: string }) => void;
}) {
  const [active, setActive] = useState(0);
  return (
    <RevealSection className="section-alt section-glow">
      <SectionHeading
        eyebrow="TRANSFORMAÇÃO REAL"
        title="Veja o que um Kit Olho na Brasa faz pela sua churrasqueira."
        description="Mais de 100.000 churrasqueiras transformadas em todo o Brasil."
        centered
      />

      <div className="mx-auto max-w-(--container-max) px-4">
        <div
          className="before-after-carousel flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ WebkitOverflowScrolling: "touch" }}
          onScroll={(e) => {
            const el = e.currentTarget;
            const idx = Math.round(el.scrollLeft / el.clientWidth);
            if (idx !== active) setActive(idx);
          }}
        >
          {beforeAfterPairs.map((pair) => (
            <article key={pair.title} className="before-after-card w-full shrink-0 snap-center">
              <BeforeAfterSlider
                before={pair.before}
                after={pair.after}
                beforeAlt={pair.beforeAlt}
                afterAlt={pair.afterAlt}
              />
              <div className="mt-3 space-y-1">
                <h3 className="text-sm font-semibold text-foreground">{pair.title}</h3>
                <p className="text-[12px] leading-[1.4] text-secondary-foreground">{pair.subtitle}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="mt-3 flex justify-center gap-1.5">
          {beforeAfterPairs.map((_, i) => (
            <span
              key={i}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: i === active ? 20 : 6,
                background: i === active ? "#E8913A" : "rgba(255,255,255,0.25)",
              }}
            />
          ))}
        </div>
      </div>
    </RevealSection>
  );
}

function ExpandableImage({
  src,
  alt,
  label,
  labelClass,
  onExpand,
}: {
  src: string;
  alt: string;
  label: string;
  labelClass: string;
  onExpand: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onExpand}
      className="group relative block h-full min-h-[280px] overflow-hidden border-r border-border last:border-r-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`Ampliar imagem: ${alt}`}
    >
      <img
        src={src}
        alt={alt}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        loading="lazy"
      />
      <span
        className={cn(
          "absolute left-3 top-3 z-10 rounded-full px-3 py-1 text-[11px] font-semibold tracking-[0.14em] backdrop-blur",
          labelClass,
        )}
      >
        {label}
      </span>
      <span className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/60 text-foreground backdrop-blur transition-colors group-hover:bg-black/80">
        <Maximize2 className="h-4 w-4" aria-hidden="true" />
      </span>
    </button>
  );
}

/* ===================== PROCESSO / FÁBRICA ===================== */
function ProcessSection({ onOpenModal }: { onOpenModal: () => void }) {
  const proof = [
    { Icon: ShieldCheck, t: "Aço inox 304 alimentício", d: "Não enferruja, não oxida, não contamina." },
    { Icon: Factory, t: "Feito sob medida", d: "Fabricado após o pedido, nas medidas exatas do seu espaço." },
    { Icon: Hammer, t: "Acabamento feito à mão", d: "Solda invisível e 6 etapas de polimento." },
    { Icon: Award, t: "15 anos de garantia", d: "O maior compromisso de durabilidade do mercado." },
  ];
  return (
    <RevealSection className="factory-section section-dark section-glow flex flex-col justify-center !py-8 md:!py-14">
      <div className="factory-inner mx-auto w-full max-w-(--container-max) px-5">
        <div className="factory-text hidden lg:block">
          <p className="section-label">POR DENTRO DA FÁBRICA</p>
          <h2
            className="mt-2 max-w-3xl font-display font-semibold leading-[1.05] text-balance text-foreground md:max-w-4xl"
            style={{ fontSize: "clamp(1.25rem, 4.6vw, 2.5rem)" }}
          >
            Cada kit passa por dezenas de etapas antes de chegar na sua casa.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
            Fábrica própria em Santa Catarina, aço inox 304 e produção sob medida: do corte à solda, cada detalhe é
            feito à mão para durar a vida toda.
          </p>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
            Desde 2019 já transformamos mais de 100 mil churrasqueiras Brasil afora. Aqui nada é de prateleira: seu kit
            é fabricado só depois do pedido — e sai com 15 anos de garantia.
          </p>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {proof.map(({ Icon, t, d }) => (
              <li key={t} className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-semibold text-foreground">{t}</p>
                  <p className="text-sm text-muted-foreground">{d}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="factory-text-mobile lg:hidden text-center">
          <p className="section-label" style={{ display: "inline-flex" }}>
            POR DENTRO DA FÁBRICA
          </p>
          <h2
            className="mx-auto mt-2 max-w-3xl font-display font-semibold leading-[1.05] text-balance text-foreground"
            style={{ fontSize: "clamp(1.5rem, 5vw, 2.75rem)" }}
          >
            Cada kit passa por dezenas de etapas antes de chegar na sua casa.
          </h2>
        </div>

        <div className="factory-media mt-6 flex w-full justify-center">
          <div
            className="factory-video glass-panel relative overflow-hidden rounded-2xl border border-border bg-black"
            style={{ aspectRatio: "9 / 16", height: "58svh", maxHeight: "58svh", maxWidth: "78vw" }}
          >
            <AutoPauseVideo
              className="h-full w-full object-cover"
              src={fabricaVideo.url}
              poster={processCutAsset.url}
            />
          </div>
        </div>

        <div className="factory-cta mt-6">
          <BlockCta label="QUERO UM KIT DESSES" onClick={onOpenModal} />
        </div>
      </div>
    </RevealSection>
  );
}

/* ===================== GALERIA ===================== */
function CarouselArrows({ targetRef }: { targetRef: React.RefObject<HTMLDivElement | null> }) {
  const scroll = (dir: -1 | 1) => {
    const el = targetRef.current;
    if (!el) return;
    const first = el.firstElementChild as HTMLElement | null;
    const amount = first ? first.offsetWidth + 16 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  };
  return (
    <>
      <button
        type="button"
        aria-label="Anterior"
        onClick={() => scroll(-1)}
        className="absolute left-0 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card/90 text-foreground backdrop-blur transition-colors hover:bg-card lg:flex"
      >
        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label="Próximo"
        onClick={() => scroll(1)}
        className="absolute right-0 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card/90 text-foreground backdrop-blur transition-colors hover:bg-card lg:flex"
      >
        <ChevronRight className="h-5 w-5" aria-hidden="true" />
      </button>
    </>
  );
}

function GallerySection({
  onOpenLightbox,
  onOpenModal,
}: {
  onOpenLightbox: (item: GalleryItem) => void;
  onOpenModal: () => void;
}) {
  const galleryRef = useRef<HTMLDivElement>(null);
  return (
    <RevealSection className="section-alt section-glow">
      <SectionHeading eyebrow="PROJETOS ENTREGUES" title="Galeria de churrasqueiras transformadas." centered />

      <div className="relative mx-auto max-w-(--container-max)">
        <div
          ref={galleryRef}
          className="gallery-grid flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {galleryItems.map((item) => (
            <button
              key={`${item.title}-${item.location}`}
              type="button"
              onClick={() => onOpenLightbox(item)}
              className={cn(
                "gallery-item group relative min-w-[85%] snap-start overflow-hidden rounded-2xl border border-border bg-card text-left shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-w-[46%] lg:min-w-[calc(33.333%-11px)]",
                "",
              )}
            >
              <div
                className="absolute inset-0 z-10 bg-linear-to-t from-background via-background/20 to-transparent opacity-90"
                aria-hidden="true"
              />
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.alt}
                  className={cn(
                    "w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]",
                    "aspect-[4/3]",
                  )}
                  loading="lazy"
                />
              ) : (
                <div className="grid aspect-square place-items-center bg-card-hover text-muted-foreground">
                  <ImageIcon className="h-8 w-8" aria-hidden="true" />
                </div>
              )}
              <span className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/60 text-foreground backdrop-blur">
                <Maximize2 className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="absolute inset-x-0 bottom-0 z-20 p-4">
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <p className="mt-1 text-sm text-secondary-foreground">{item.location}</p>
              </div>
            </button>
          ))}
        </div>
        <CarouselArrows targetRef={galleryRef} />
      </div>
      <BlockCta label="COMEÇAR MEU PROJETO" onClick={onOpenModal} />
    </RevealSection>
  );
}

/* ===================== VÍDEOS DE CLIENTES ===================== */
function ClientVideosSection({ onOpenModal }: { onOpenModal: () => void }) {
  const clientsRef = useRef<HTMLDivElement>(null);
  return (
    <RevealSection className="section-alt section-glow">
      <SectionHeading eyebrow="CLIENTES REAIS" title="Veja a reação de quem recebeu o Kit Olho na Brasa." centered />
      <div className="relative mx-auto max-w-(--container-max)">
        <div
          ref={clientsRef}
          className="client-videos-container flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {clientVideos.map((video, idx) => (
            <ClientVideoCard key={video.src} video={video} index={idx} />
          ))}
        </div>
        <CarouselArrows targetRef={clientsRef} />
      </div>
      <p className="mx-auto mt-6 max-w-2xl px-5 text-center text-sm text-secondary-foreground md:text-base">
        Mais de 100.000 kits entregues em todo o Brasil.
      </p>
      <BlockCta label="QUERO RECEBER O MEU" onClick={onOpenModal} />
    </RevealSection>
  );
}

function ClientVideoCard({ video, index }: { video: ClientVideo; index: number }) {
  const [playing, setPlaying] = useState(false);
  const cardRef = React.useRef<HTMLElement>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  // Promove preload de "none" para "metadata" quando o card entra na viewport
  React.useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const v = entry.target.querySelector("video");
            if (v) v.preload = "metadata";
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "200px" },
    );
    observer.observe(card);
    return () => observer.disconnect();
  }, []);

  // Pausa o vídeo quando sai da viewport
  React.useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            v.pause();
          }
        });
      },
      { threshold: 0.25 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  return (
    <article
      ref={cardRef}
      className="client-video-card group min-w-[70%] snap-start overflow-hidden rounded-2xl border border-border bg-card shadow-soft md:min-w-[40%] lg:min-w-[calc(33.333%-11px)]"
    >
      <div className="relative aspect-[9/16] overflow-hidden bg-black">
        <video
          ref={videoRef}
          src={video.src}
          poster={video.poster}
          controls={playing}
          playsInline
          preload="none"
          className="absolute inset-0 h-full w-full object-cover"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
        />
        {!playing ? (
          <button
            type="button"
            onClick={() => {
              const v = videoRef.current;
              if (v) {
                v.preload = "metadata";
                v.play()
                  .then(() => setPlaying(true))
                  .catch(() => {});
              }
            }}
            aria-label={`Reproduzir vídeo do cliente ${index + 1}`}
            className="absolute inset-0 z-10 flex items-center justify-center bg-gradient-to-t from-black/60 via-black/10 to-transparent transition-colors hover:from-black/70"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 text-black shadow-fire transition-transform group-hover:scale-110">
              <Play className="ml-1 h-7 w-7 fill-current" aria-hidden="true" />
            </span>
          </button>
        ) : null}
      </div>
      <div className="space-y-1 p-4">
        <p className="text-sm font-semibold text-foreground">{video.name}</p>
        <p className="text-xs text-secondary-foreground md:text-sm">{video.caption}</p>
      </div>
    </article>
  );
}

/* ===================== AUTO-PAUSE VIDEO (pausa quando sai da viewport) ===================== */
function AutoPauseVideo({ src, poster, className }: { src: string; poster?: string; className?: string }) {
  const ref = React.useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            el.play().catch(() => {});
          } else {
            el.pause();
          }
        }
      },
      { threshold: [0, 0.5, 1] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const toggleMute = () => {
    const el = ref.current;
    if (!el) return;
    const next = !muted;
    el.muted = next;
    setMuted(next);
    if (!next) el.play().catch(() => {});
  };
  return (
    <>
      <video
        ref={ref}
        className={className}
        src={src}
        poster={poster}
        loop
        muted={muted}
        playsInline
        preload="metadata"
      />
      <button
        type="button"
        onClick={toggleMute}
        aria-label={muted ? "Ativar som do vídeo" : "Desativar som do vídeo"}
        className="absolute bottom-3 right-3 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white backdrop-blur transition-colors hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {muted ? (
          <VolumeX className="h-5 w-5" aria-hidden="true" />
        ) : (
          <Volume2 className="h-5 w-5" aria-hidden="true" />
        )}
      </button>
    </>
  );
}

function DifferentialsSection() {
  const items = [
    { t: "Não enferruja", d: "Inox 304 alimentício", Icon: ShieldCheck },
    { t: "Produção Artesanal", d: "Acabamento Premium", Icon: Hammer },
    { t: "+7 anos de mercado", d: "Referência no Brasil", Icon: Factory },
    { t: "Alto Padrão", d: "15 anos de garantia", Icon: Award },
    { t: "Compra com Segurança", d: "Suporte pós-venda 100%", Icon: Lock, wide: true },
  ];
  return (
    <RevealSection className="section-dark">
      <div className="trust-grid mx-auto grid max-w-(--container-max) grid-cols-2 gap-2.5 px-4 md:grid-cols-5">
        {items.map(({ t, d, Icon, wide }) => (
          <div
            key={t}
            className={cn(
              "trust-card flex flex-col items-center rounded-xl border p-3.5 text-center backdrop-blur-sm",
              wide ? "col-span-2 md:col-span-1" : "",
            )}
            style={{ background: "#1a1a1a", borderColor: "#2a2a2a", borderWidth: "0.5px" }}
          >
            <span
              className="grid h-10 w-10 place-items-center rounded-full"
              style={{ background: "rgba(255,107,0,0.12)", color: "#E8913A" }}
            >
              <Icon className="h-[22px] w-[22px]" strokeWidth={1.75} />
            </span>
            <p className="mt-2.5 text-[13px] font-medium text-foreground">{t}</p>
            <p className="mt-0.5 text-[11px]" style={{ color: "#888" }}>
              {d}
            </p>
          </div>
        ))}
      </div>
    </RevealSection>
  );
}

/* ===================== AVALIAÇÕES NO GOOGLE ===================== */
const googleReviews = [
  {
    quote: "Excelente atendimento, material de primeira qualidade e ótimo acabamento. Entrega no prazo! Recomendo.",
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
  {
    quote: "Produto de extrema qualidade. Superou as expectativas.",
    author: "Diego Macedo",
  },
  {
    quote:
      "Produto de altíssima qualidade, atendimento excepcional, recomendo fortemente. Melhorou muito meus momentos de lazer na minha casa com esses acessórios para a churrasqueira.",
    author: "Cliente Google",
  },
];

function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <path
        fill="#EA4335"
        d="M24 9.5c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 2.97 29.93 1 24 1 15.4 1 7.96 5.93 4.34 13.12l7.35 5.7C13.42 13.37 18.27 9.5 24 9.5z"
      />
    </svg>
  );
}

function GoogleReviewsSection({ onOpenModal }: { onOpenModal: () => void }) {
  const reviewsRef = useRef<HTMLDivElement>(null);
  const mapsUrl =
    "https://www.google.com/maps/place/Olho+na+Brasa/@-27.1016701,-48.6187495,738m/data=!3m1!1e3!4m8!3m7!1s0x94d8b100c4230f17:0x899b6cbbbfaceb99!8m2!3d-27.1016701!4d-48.6161746!9m1!1b1!16s%2Fg%2F11rzr1kln5?entry=ttu&g_ep=EgoyMDI2MDYyNC4wIKXMDSoASAFQAw%3D%3D";
  return (
    <RevealSection className="section-alt section-glow">
      <SectionHeading eyebrow="AVALIAÇÕES NO GOOGLE" title="O que nossos clientes dizem no Google" centered />

      <div className="mx-auto mb-10 flex max-w-md flex-col items-center gap-3 rounded-2xl border border-border bg-card/60 px-6 py-6 text-center shadow-soft">
        <div className="flex items-center gap-2">
          <GoogleLogo className="h-6 w-6" />
          <span className="text-lg font-semibold text-foreground">Google</span>
        </div>
        <div className="flex items-center gap-0.5" aria-label="4.7 de 5 estrelas">
          {[0, 1, 2, 3].map((i) => (
            <Star key={i} className="h-5 w-5 fill-current" style={{ color: "#FFB800" }} aria-hidden="true" />
          ))}
          <div className="relative h-5 w-5">
            <Star className="absolute inset-0 h-5 w-5" style={{ color: "#FFB800" }} aria-hidden="true" />
            <div className="absolute inset-0 overflow-hidden" style={{ width: "70%" }}>
              <Star className="h-5 w-5 fill-current" style={{ color: "#FFB800" }} aria-hidden="true" />
            </div>
          </div>
        </div>
        <p className="text-sm" style={{ color: "#888" }}>
          41 avaliações
        </p>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-semibold text-primary hover:underline"
        >
          Ver todas no Google Maps →
        </a>
      </div>

      <div className="relative mx-auto max-w-(--container-max)">
        <div
          ref={reviewsRef}
          className="google-reviews-carousel flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {googleReviews.map((review, idx) => (
            <article
              key={idx}
              className="google-review-card min-w-[85%] snap-start rounded-xl bg-white p-6 md:min-w-[46%] lg:min-w-[calc(33.333%-11px)]"
              style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
            >
              <div className="mb-3 flex items-center justify-between">
                <GoogleLogo className="h-5 w-5" />
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" style={{ color: "#FFB800" }} aria-hidden="true" />
                  ))}
                </div>
              </div>
              <blockquote className="text-sm leading-[1.6]" style={{ color: "#333" }}>
                “{review.quote}”
              </blockquote>
              <div className="mt-5 flex items-center gap-3 border-t border-neutral-200 pt-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-200 text-neutral-500">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                    <path d="M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-4 0-8 2-8 6v2h16v-2c0-4-4-6-8-6z" />
                  </svg>
                </div>
                <div className="leading-tight">
                  <p className="text-sm font-semibold" style={{ color: "#222" }}>
                    {review.author}
                  </p>
                  <p className="text-xs" style={{ color: "#888" }}>
                    Avaliação do Google
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
        <CarouselArrows targetRef={reviewsRef} />
      </div>

      <BlockCta label="QUERO MEU PROJETO" onClick={onOpenModal} />
    </RevealSection>
  );
}

function FaqSection({ onOpenModal }: { onOpenModal: () => void }) {
  return (
    <RevealSection className="faq-section section-dark">
      <SectionHeading title="Dúvidas frequentes" centered />
      <div className="mx-auto max-w-4xl px-5">
        <Accordion type="single" collapsible className="rounded-2xl border border-border bg-card px-5 py-2 shadow-soft">
          {faqItems.map((item, index) => (
            <AccordionItem key={item.question} value={`item-${index}`} className="border-border">
              <AccordionTrigger className="py-5 text-base font-semibold text-foreground hover:no-underline">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="pb-5 text-sm leading-7 text-secondary-foreground">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </RevealSection>
  );
}

/* ===================== CTA FINAL ===================== */
function PromoTopBar({ onOpenModal }: { onOpenModal: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpenModal}
      className="sticky top-0 z-40 flex w-full items-center justify-center gap-2 bg-primary px-4 py-2.5 text-center text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-strong sm:text-sm"
    >
      🔥 DIA DOS PAIS: 10% OFF no Kit Suporte Suspenso
      <span className="hidden underline underline-offset-2 sm:inline">Garantir agora</span>
    </button>
  );
}

function PromoBannerPais({ onOpenModal }: { onOpenModal: () => void }) {
  return (
    <section className="promo-pais section-dark relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(60% 120% at 85% 50%, color-mix(in oklab, var(--primary) 22%, transparent), transparent 70%)",
        }}
        aria-hidden="true"
      />
      <div className="relative mx-auto flex max-w-(--container-max) flex-col items-center gap-6 px-5 py-12 text-center lg:flex-row lg:items-center lg:justify-between lg:gap-12 lg:py-16 lg:text-left">
        <div className="lg:flex-1">
          <p className="font-display italic text-foreground/90" style={{ fontSize: "clamp(1.1rem, 3.4vw, 1.75rem)" }}>
            Seu pai merece o melhor
          </p>
          <p className="font-display font-bold leading-[0.9]" style={{ fontSize: "clamp(3.2rem, 13vw, 6.5rem)" }}>
            <span className="text-primary">10%</span>
            <span className="text-foreground"> OFF</span>
          </p>
          <p className="mt-2 text-secondary-foreground" style={{ fontSize: "clamp(0.95rem, 2.6vw, 1.15rem)" }}>
            No seu <strong className="text-foreground">Kit Suporte Suspenso</strong>. A vida é melhor com{" "}
            <span className="font-semibold text-primary">churrasco.</span>
          </p>
        </div>
        <div className="flex flex-col items-center gap-3 lg:items-end">
          <button
            type="button"
            onClick={onOpenModal}
            className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-primary px-7 text-sm font-bold uppercase tracking-[0.03em] text-primary-foreground shadow-fire transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary-strong"
          >
            <ShoppingCart className="h-5 w-5" aria-hidden="true" />
            QUERO MEU KIT COM 10% OFF
          </button>
          <p className="max-w-xs text-xs text-muted-foreground">
            *Válido por tempo limitado ou enquanto durar os estoques.
          </p>
        </div>
      </div>
    </section>
  );
}

function FinalCtaSection({ onOpenModal }: { onOpenModal: () => void }) {
  return (
    <RevealSection className="final-cta-section section-cta">
      <section className="mx-auto max-w-4xl px-5 text-center">
        <div className="relative overflow-hidden rounded-3xl border border-border-strong bg-card px-6 py-10 shadow-fire md:px-10 md:py-14">
          <div
            className="absolute inset-x-1/2 top-0 h-48 w-48 -translate-x-1/2 rounded-full bg-primary/18 blur-3xl"
            aria-hidden="true"
          />
          <h2
            className="relative font-display font-semibold leading-[1.04] text-balance text-foreground"
            style={{ fontSize: "clamp(1.6rem,6vw,3rem)" }}
          >
            Sua churrasqueira merece um upgrade de verdade.
          </h2>
          <p className="relative mx-auto mt-4 max-w-2xl text-base leading-7 text-secondary-foreground md:text-lg">
            Projeto sob medida, inox 304 alimentício, garantia de 15 anos.
          </p>
          <BlockCta label="QUERO MEU PROJETO AGORA" onClick={onOpenModal} />
          <p className="relative mt-5 text-sm leading-6 text-muted-foreground">
            Fábrica própria em SC &nbsp;•&nbsp; 15 anos de garantia &nbsp;•&nbsp; Sob medida
          </p>
        </div>
      </section>
    </RevealSection>
  );
}

function Footer() {
  return (
    <footer className="bg-footer pb-28 pt-12 text-center md:pb-12">
      <div className="footer-content mx-auto max-w-(--container-max) px-5">
        <img src={logoOlhoNaBrasa.url} alt="Olho na Brasa" className="mx-auto h-12 w-auto" />
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-secondary-foreground">
          Olho na Brasa, fábrica de grelhas e acessórios premium em inox 304. Santa Catarina, Brasil.
        </p>
        <div className="mt-6 space-y-1 text-sm text-muted-foreground">
          <p>Instagram: @olhonabrasa</p>
          <p>WhatsApp: (47) 4042-0956</p>
          <p>Site: www.olhonabrasa.com.br</p>
        </div>
        <div className="mt-8 space-y-1 text-xs text-muted-foreground">
          <p>OLHO NA BRASA LTDA — CNPJ: 43.062.681/0001-25</p>
          <p>© 2026 Olho na Brasa. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}

function FloatingWhatsappButton({ onOpenChat }: { onOpenChat: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpenChat}
      aria-label="Abrir chat WhatsApp"
      className="invisible pointer-events-none whatsapp-pulse fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-whatsapp text-whatsapp-foreground transition-transform duration-300 hover:scale-110"
    >
      <svg viewBox="0 0 32 32" className="h-7 w-7 fill-current" aria-hidden="true">
        <path d="M19.11 17.23c-.27-.14-1.6-.79-1.85-.88-.25-.09-.43-.14-.61.14-.18.27-.7.88-.86 1.06-.16.18-.32.2-.59.07-.27-.14-1.14-.42-2.18-1.33-.81-.72-1.36-1.61-1.52-1.88-.16-.27-.02-.42.12-.56.12-.12.27-.32.41-.48.14-.16.18-.27.27-.45.09-.18.05-.34-.02-.48-.07-.14-.61-1.48-.84-2.03-.22-.53-.45-.46-.61-.47-.16-.01-.34-.01-.52-.01-.18 0-.48.07-.73.34-.25.27-.96.93-.96 2.28s.98 2.65 1.11 2.84c.14.18 1.92 2.93 4.65 4.11.65.28 1.15.44 1.55.56.65.21 1.24.18 1.71.11.52-.08 1.6-.65 1.82-1.27.22-.62.22-1.15.16-1.27-.07-.11-.25-.18-.52-.32Z" />
        <path d="M16.02 3.2c-7.07 0-12.8 5.71-12.8 12.76 0 2.25.59 4.44 1.7 6.37L3 29l6.86-1.79a12.83 12.83 0 0 0 6.16 1.57h.01c7.07 0 12.8-5.71 12.8-12.77S23.1 3.2 16.02 3.2Zm0 23.46h-.01a10.7 10.7 0 0 1-5.45-1.49l-.39-.23-4.07 1.06 1.09-3.96-.25-.41a10.62 10.62 0 0 1-1.64-5.62c0-5.89 4.82-10.68 10.73-10.68 2.87 0 5.56 1.11 7.58 3.13a10.58 10.58 0 0 1 3.15 7.55c0 5.9-4.82 10.69-10.74 10.69Z" />
      </svg>
    </button>
  );
}

function BlockCta({ label, onClick, fullWidth }: { label: string; onClick: () => void; fullWidth?: boolean }) {
  return (
    <div
      className={cn(
        "mx-auto mt-8 flex max-w-(--container-max) justify-center px-5 block-cta-wrap",
        fullWidth ? "px-0" : "",
      )}
    >
      <Button
        size="lg"
        onClick={onClick}
        className={cn(
          "block-cta min-h-14 rounded-xl bg-primary px-4 text-[13px] font-bold uppercase tracking-[0.03em] text-primary-foreground shadow-fire transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary-strong sm:px-6 sm:text-sm sm:tracking-[0.05em]",
          fullWidth ? "w-full" : "w-full max-w-md md:w-auto md:min-w-[320px]",
        )}
      >
        {label} <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
}

/* ===================== MODAL CONSULTIVO ===================== */
function ConsultiveModal({
  open,
  stage,
  projectType,
  estagio,
  form,
  formattedWhatsapp,
  cityState,
  onClose,
  onMomentSelect,
  onProjectTypeSelect,
  onContinuePhoto,
  onContinueContact,
  onChangeField,
  onFinalAction,
  specialistMessage,
  measurementHelpMessage,
}: {
  open: boolean;
  stage: ModalStage;
  projectType: ProjectType;
  estagio: string;
  form: ContactForm;
  formattedWhatsapp: string;
  cityState: string;
  onClose: () => void;
  onMomentSelect: (moment: NonNullable<ProjectMoment>) => void;
  onProjectTypeSelect: (type: NonNullable<ProjectType>) => void;
  onContinuePhoto: () => void;
  onContinueContact: () => void;
  onChangeField: (field: keyof ContactForm, value: string) => void;
  onFinalAction: (url: string) => void | Promise<void>;
  specialistMessage: string;
  measurementHelpMessage: string;
}) {
  if (!open) return null;

  void cityState;
  void estagio;
  void projectType;
  void measurementHelpMessage;
  const canContinueContact = Boolean(form.name.trim() && form.whatsapp.trim() && form.city.trim() && form.state.trim());

  const handleFinalAction = (url: string) => {
    void onFinalAction(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/85 p-0 md:items-center md:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="consultive-modal-title"
    >
      <div className="relative max-h-[95svh] w-full overflow-hidden rounded-t-[28px] border border-border-strong bg-card shadow-fire md:max-h-[90svh] md:max-w-[520px] md:rounded-[28px]">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 id="consultive-modal-title" className="text-lg font-semibold text-foreground">
            Vamos montar seu projeto 🔥
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background/70 text-foreground transition-colors hover:bg-card-hover"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="max-h-[calc(95svh-72px)] space-y-5 overflow-y-auto px-5 py-5 md:max-h-[calc(90svh-72px)]">
          {stage === "stage" ? (
            <div className="space-y-3">
              <OptionButton
                icon={<Hammer className="h-5 w-5" />}
                title="Estou construindo ou reformando minha churrasqueira"
                description="Fluxo ideal para quem quer projetar certo desde o início"
                onClick={() => onMomentSelect("obra")}
              />
              <OptionButton
                icon={<CheckCircle2 className="h-5 w-5" />}
                title="Já tenho a churrasqueira pronta, só falta o kit"
                description="Vamos confirmar medidas e direcionar para o especialista"
                onClick={() => onMomentSelect("pronta")}
              />
            </div>
          ) : null}

          {stage === "projectType" ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Que tipo de projeto você procura?</h3>
                <p className="mt-2 text-sm leading-6 text-secondary-foreground">
                  Escolha a opção mais próxima — o especialista refina com você no WhatsApp.
                </p>
              </div>
              <div className="grid gap-3">
                <ProjectTypeCard
                  active={projectType === "kit"}
                  image={kitCompletoAsset.url}
                  title="Kit completo (grelha + suporte suspenso + espetos)"
                  subtitle="Nosso kit mais vendido"
                  onClick={() => onProjectTypeSelect("kit")}
                />
                <ProjectTypeCard
                  active={projectType === "suporte"}
                  image={suporteSuspensoAsset.url}
                  title="Só o Suporte Suspenso com uma grelha ou espeto separado"
                  subtitle="Ideal para complementar o que você já tem"
                  onClick={() => onProjectTypeSelect("suporte")}
                />
              </div>
            </div>
          ) : null}

          {stage === "photo" ? (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Para agilizar seu atendimento, consegue enviar uma foto da sua churrasqueira?
                </h3>
                <p className="mt-2 text-sm leading-6 text-secondary-foreground">
                  A foto ajuda muito o especialista a entender seu projeto.
                </p>
              </div>
              <PhotoUpload onPhotoUploaded={(url) => onChangeField("photoUrl", url)} />
              <Button
                type="button"
                size="lg"
                className="min-h-13 w-full rounded-xl bg-primary text-sm font-bold tracking-[0.08em] text-primary-foreground hover:bg-primary-strong"
                onClick={onContinuePhoto}
              >
                CONTINUAR <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          ) : null}

          {stage === "contact" ? (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Quase lá! Como podemos te chamar?</h3>
                <p className="mt-2 text-sm leading-6 text-secondary-foreground">
                  Assim já deixamos seu atendimento mais ágil no WhatsApp.
                </p>
              </div>
              <div className="grid gap-4">
                <LabelField label="Nome">
                  <input
                    value={form.name}
                    onChange={(e) => onChangeField("name", e.target.value)}
                    className="field-base"
                  />
                </LabelField>
                <LabelField label="WhatsApp">
                  <input
                    value={formattedWhatsapp}
                    onChange={(e) => onChangeField("whatsapp", e.target.value)}
                    inputMode="tel"
                    className="field-base"
                  />
                </LabelField>
                <LabelField label="E-mail">
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => onChangeField("email", e.target.value)}
                    className="field-base"
                    placeholder="seu@email.com"
                  />
                </LabelField>
                <div className="grid grid-cols-[1fr_100px] gap-3">
                  <LabelField label="Cidade">
                    <input
                      value={form.city}
                      onChange={(e) => onChangeField("city", e.target.value)}
                      className="field-base"
                    />
                  </LabelField>
                  <LabelField label="Estado">
                    <input
                      value={form.state}
                      onChange={(e) => onChangeField("state", e.target.value.toUpperCase().slice(0, 2))}
                      maxLength={2}
                      placeholder="UF"
                      className="field-base uppercase"
                    />
                  </LabelField>
                </div>
              </div>
              <Button
                type="button"
                size="lg"
                disabled={!canContinueContact}
                className="min-h-13 w-full rounded-xl bg-primary text-sm font-bold tracking-[0.08em] text-primary-foreground hover:bg-primary-strong disabled:bg-primary/35"
                onClick={onContinueContact}
              >
                CONTINUAR <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          ) : null}

          {stage === "path" ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Tudo certo! Como prefere seguir?</h3>
                <p className="mt-2 text-sm leading-6 text-secondary-foreground">
                  Escolha o caminho mais confortável para você agora.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleFinalAction(specialistMessage)}
                className="block w-full rounded-2xl border-2 border-primary bg-primary/10 p-4 text-left shadow-soft transition-colors hover:bg-primary/15"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-whatsapp text-whatsapp-foreground">
                    <svg viewBox="0 0 32 32" className="h-5 w-5 fill-current" aria-hidden="true">
                      <path d="M19.11 17.23c-.27-.14-1.6-.79-1.85-.88-.25-.09-.43-.14-.61.14-.18.27-.7.88-.86 1.06-.16.18-.32.2-.59.07-.27-.14-1.14-.42-2.18-1.33-.81-.72-1.36-1.61-1.52-1.88-.16-.27-.02-.42.12-.56.12-.12.27-.32.41-.48.14-.16.18-.27.27-.45.09-.18.05-.34-.02-.48-.07-.14-.61-1.48-.84-2.03-.22-.53-.45-.46-.61-.47-.16-.01-.34-.01-.52-.01-.18 0-.48.07-.73.34-.25.27-.96.93-.96 2.28s.98 2.65 1.11 2.84c.14.18 1.92 2.93 4.65 4.11.65.28 1.15.44 1.55.56.65.21 1.24.18 1.71.11.52-.08 1.6-.65 1.82-1.27.22-.62.22-1.15.16-1.27-.07-.11-.25-.18-.52-.32Z" />
                      <path d="M16.02 3.2c-7.07 0-12.8 5.71-12.8 12.76 0 2.25.59 4.44 1.7 6.37L3 29l6.86-1.79a12.83 12.83 0 0 0 6.16 1.57h.01c7.07 0 12.8-5.71 12.8-12.77S23.1 3.2 16.02 3.2Zm0 23.46h-.01a10.7 10.7 0 0 1-5.45-1.49l-.39-.23-4.07 1.06 1.09-3.96-.25-.41a10.62 10.62 0 0 1-1.64-5.62c0-5.89 4.82-10.68 10.73-10.68 2.87 0 5.56 1.11 7.58 3.13a10.58 10.58 0 0 1 3.15 7.55c0 5.9-4.82 10.69-10.74 10.69Z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-base font-semibold text-foreground">Falar agora com um especialista</p>
                    <p className="mt-1 text-sm leading-6 text-secondary-foreground">Resposta em minutos no WhatsApp</p>
                  </div>
                </div>
              </button>

            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Lightbox({
  image,
  onClose,
}: {
  image: { src: string; alt: string; title?: string; subtitle?: string };
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/60 text-foreground backdrop-blur"
        aria-label="Fechar"
      >
        <X className="h-5 w-5" />
      </button>
      <div className="relative w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
        {image.src ? (
          <img src={image.src} alt={image.alt} className="mx-auto max-h-[85svh] w-auto rounded-xl object-contain" />
        ) : null}
        {image.title ? (
          <div className="mt-4 px-2 text-center">
            <p className="text-base font-semibold text-foreground">{image.title}</p>
            {image.subtitle ? <p className="mt-1 text-sm text-secondary-foreground">{image.subtitle}</p> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function RevealSection({ id, className, as = "section", children, style }: RevealProps) {
  const generatedId = useId().replace(/:/g, "");
  const [visible, setVisible] = useState(false);
  const Component = as;
  const elementId = id ?? `section-${generatedId}`;

  useEffect(() => {
    const element = document.getElementById(elementId);
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [elementId]);

  return (
    <Component
      id={elementId}
      style={style}
      className={cn("scroll-mt-20 px-0 py-14 md:py-20", visible ? "fade-visible" : "fade-hidden", className)}
    >
      {children}
    </Component>
  );
}

function SectionHeading({ eyebrow, title, description, centered }: SectionHeadingProps) {
  return (
    <div className={cn("mx-auto mb-8 max-w-(--container-max) px-5", centered ? "text-center" : "")}>
      {eyebrow ? (
        <p
          className={cn("section-label", centered ? "justify-center" : "")}
          style={centered ? { display: "inline-flex" } : undefined}
        >
          {eyebrow}
        </p>
      ) : null}
      <h2
        className={cn(
          "mt-2 max-w-3xl font-display font-semibold leading-[1.05] text-balance text-foreground md:max-w-4xl",
          centered ? "mx-auto" : "",
        )}
        style={{ fontSize: "clamp(1.5rem, 5vw, 2.75rem)" }}
      >
        {title}
      </h2>
      {description ? (
        <p
          className={cn(
            "mt-3 max-w-2xl text-sm leading-6 text-secondary-foreground md:text-base",
            centered ? "mx-auto" : "",
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}

function OptionButton({
  icon,
  title,
  description,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-16 w-full items-start gap-3 rounded-2xl border border-border bg-background/50 px-4 py-4 text-left transition-colors hover:bg-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </span>
      <span>
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        <span className="mt-1 block text-sm leading-6 text-secondary-foreground">{description}</span>
      </span>
    </button>
  );
}

function ProjectTypeCard({
  active,
  title,
  subtitle,
  image,
  onClick,
}: {
  active: boolean;
  title: string;
  subtitle: string;
  image?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full overflow-hidden rounded-2xl border text-left transition-colors",
        active ? "border-primary bg-primary/10" : "border-border bg-background/50 hover:bg-card-hover",
      )}
    >
      {image ? (
        <div className="aspect-[16/10] w-full overflow-hidden bg-black/40">
          <img src={image} alt={title} className="h-full w-full object-contain" loading="lazy" />
        </div>
      ) : null}
      <div className="px-5 py-4">
        <p className="text-sm font-semibold text-foreground md:text-base">{title}</p>
        <p className="mt-1 text-xs leading-5 text-secondary-foreground md:text-sm">{subtitle}</p>
      </div>
    </button>
  );
}

function LabelField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-foreground">
      <span>{label}</span>
      {children}
    </label>
  );
}

function formatWhatsapp(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  const ddd = digits.slice(0, 2);
  const first = digits.length > 10 ? digits.slice(2, 7) : digits.slice(2, 6);
  const last = digits.length > 6 ? digits.slice(digits.length > 10 ? 7 : 6) : "";
  if (!ddd) return digits;
  if (!first) return `(${ddd}`;
  if (!last) return `(${ddd}) ${first}`;
  return `(${ddd}) ${first}-${last}`;
}

function buildWhatsappHref(text: string) {
  return `${WHATSAPP_URL}?text=${encodeURIComponent(text)}`;
}

const projectTypeLabels: Record<NonNullable<ProjectType>, string> = {
  kit: "Kit completo (grelha + suporte suspenso + espetos)",
  suporte: "Suporte Suspenso com grelha ou espeto",
};

function buildWhatsappMessage({
  intro: _intro,
  form: _form,
  projectType: _projectType,
}: {
  intro: string;
  form: ContactForm;
  projectType?: ProjectType;
}) {
  return buildWhatsappHref("Olá! Quero montar meu Kit Premium. Vim pela landing page.");
}

