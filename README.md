# Brasa Premium

# PROMPT COMPLETO — LANDING PAGE OLHO NA BRASA (LOVABLE)

---

## CONTEXTO DO PROJETO

Crie uma Landing Page premium para a **Olho na Brasa**, fabricante de grelhas e acessórios em aço inox 304 para churrasqueiras. A página deve ser **100% mobile-first** (a maioria do tráfego vem de anúncios no Instagram/Facebook via celular), com design **dark/premium** inspirado em Apple (fotografia cinematográfica), Nubank Ultravioleta (minimalismo sofisticado) e estrutura comercial de convencimento consultivo.

**Objetivo da página:** gerar leads qualificados via WhatsApp e direcionar para compra no site. NÃO é uma página de produto — é uma página de convencimento premium com captura consultiva.

**Público-alvo:** Homem, ~46 anos, cidades médias e litoral de SC/SP/PR/RS, está construindo ou reformando churrasqueira, ticket médio R$3.500, decide em até 3 dias quando está em obra. Principal medo: errar a medida e o kit não caber. Principal dor emocional: vergonha da churrasqueira feia quando recebe visita.

**WhatsApp da empresa (API oficial):** (47) 4042-0956
**Site principal:** https://www.olhonabrasa.com.br
**Página de kits:** https://www.olhonabrasa.com.br/kits-premium/
**Instagram:** @olhonabrasa (117K seguidores)

---

## DESIGN SYSTEM

### Paleta de cores (dark premium com calor de fogo)

```
--color-bg-primary: #0A0A0A          (fundo principal — preto profundo)
--color-bg-secondary: #111111        (fundo de seções alternadas)
--color-bg-card: #1A1A1A             (fundo de cards/blocos)
--color-bg-card-hover: #222222       (hover em cards)
--color-border: #2A2A2A             (bordas sutis)
--color-border-accent: #3A3A3A      (bordas com mais destaque)

--color-accent-primary: #FF6B00      (laranja fogo — CTAs principais, destaques)
--color-accent-secondary: #FF8C33    (laranja claro — hover de CTAs)
--color-accent-glow: rgba(255,107,0,0.15)  (glow sutil atrás de elementos)
--color-accent-warm: #E85D00        (laranja escuro — variação)

--color-text-primary: #FFFFFF        (texto principal)
--color-text-secondary: #B0B0B0      (texto secundário/descrições)
--color-text-muted: #707070          (texto terciário/labels)

--color-success: #22C55E             (verde confirmação — badges, checks)
--color-whatsapp: #25D366            (verde WhatsApp — botão WhatsApp)
```

### Tipografia

```
--font-display: 'Inter', sans-serif   (headlines — peso 700-800)
--font-body: 'Inter', sans-serif      (corpo — peso 400-500)

/* Escala mobile-first */
--text-hero: clamp(2rem, 8vw, 3.5rem)       /* Hero headline */
--text-section-title: clamp(1.5rem, 5vw, 2.5rem)  /* Títulos de seção */
--text-subtitle: clamp(1.1rem, 3vw, 1.5rem)       /* Subtítulos */
--text-body: 1rem                                   /* Corpo */
--text-small: 0.875rem                              /* Labels, badges */
--text-caption: 0.75rem                              /* Captions, legal */

/* Espaçamento entre letras */
--tracking-tight: -0.02em    /* Headlines */
--tracking-normal: 0         /* Corpo */
--tracking-wide: 0.05em      /* Labels uppercase */
```

### Layout e espaçamento

```
--container-max: 1200px
--container-padding: 1.25rem        /* Mobile: 20px de cada lado */
--section-spacing: 5rem             /* Espaço entre seções — generoso */
--card-radius: 16px
--card-padding: 1.5rem
--button-radius: 12px
--button-padding: 1rem 2rem
```

### Efeitos visuais

```css
/* Glass morphism para cards */
.glass-card {
  background: rgba(26, 26, 26, 0.8);
  backdrop-filter: blur(20px);
  border: 1px solid var(--color-border);
  border-radius: var(--card-radius);
}

/* Glow accent atrás de elementos hero */
.accent-glow {
  box-shadow: 0 0 80px var(--color-accent-glow),
              0 0 160px rgba(255, 107, 0, 0.05);
}

/* Animação fade-in on scroll (usar Intersection Observer) */
.fade-in {
  opacity: 0;
  transform: translateY(30px);
  transition: opacity 0.8s ease, transform 0.8s ease;
}
.fade-in.visible {
  opacity: 1;
  transform: translateY(0);
}

/* Botão CTA principal com glow */
.cta-primary {
  background: var(--color-accent-primary);
  color: #FFFFFF;
  font-weight: 700;
  padding: var(--button-padding);
  border-radius: var(--button-radius);
  box-shadow: 0 4px 24px rgba(255, 107, 0, 0.3);
  transition: all 0.3s ease;
}
.cta-primary:hover {
  background: var(--color-accent-secondary);
  box-shadow: 0 6px 32px rgba(255, 107, 0, 0.4);
  transform: translateY(-2px);
}
```

---

## ESTRUTURA DA PÁGINA — BLOCO A BLOCO

Cada seção deve ter animação **fade-in on scroll** usando Intersection Observer. Todas as seções devem usar `scroll-snap-align` no mobile para navegação fluida.

---

### BLOCO 1 — HERO SECTION

**Layout mobile (prioridade):**
- Imagem do Rodrigo (dono) segurando o Kit Suporte Suspenso nas mãos — ocupa full-width, altura ~60vh
- Sobre a imagem, na parte inferior, gradiente escuro (de transparente em cima para #0A0A0A embaixo)
- Sobre o gradiente, o conteúdo de texto
- Badge de autoridade flutuante no canto superior direito da imagem

**Layout desktop:**
- Split layout: texto à esquerda (50%), imagem do Rodrigo à direita (50%)
- Imagem com leve parallax no scroll

**Conteúdo:**

```
[Badge no topo da imagem]
★★★★★  100.000+ churrasqueiras entregues

[Headline — sobre o gradiente escuro]
Sua churrasqueira merece um upgrade de verdade.

[Subheadline]
Kit Premium em Inox 304, feito sob medida pra sua churrasqueira. 
Direto da fábrica, com garantia de 15 anos.

[Linha de benefícios — ícones pequenos em linha, scroll horizontal no mobile]
✓ Inox 304 alimentício
✓ Sob medida 
✓ 15 anos de garantia
✓ Frete grátis Sul/Sudeste

[CTA principal]
QUERO MEU PROJETO  →
(cor: --color-accent-primary, full-width no mobile)

[Texto auxiliar abaixo do CTA, em --color-text-muted]
Fale com um especialista ou compre direto no site
```

**Observações técnicas:**
- A imagem do Rodrigo será fornecida separadamente. Use como placeholder uma imagem hero escura com gradiente. Deixar a estrutura pronta para receber `<img>` ou `background-image`.
- O fundo atrás do Rodrigo deve ter leve efeito de fumaça/gradiente quente (simular com CSS: gradiente radial sutil em laranja 5% de opacidade no centro-inferior da imagem).
- No mobile, a imagem não deve ser cortada na cabeça — dar prioridade para rosto + mãos + kit visíveis.

---

### BLOCO 2 — VÍDEO CINEMATOGRÁFICO

**Layout:**
- Container com aspect-ratio 16:9
- Borda 1px solid var(--color-border) com border-radius var(--card-radius)
- Ícone de play centralizado (triângulo branco com círculo semi-transparente)
- Thumbnail escuro como placeholder
- Ao clicar, abre vídeo inline (embed YouTube/Vimeo) ou lightbox

**Conteúdo:**

```
[Label acima do vídeo — uppercase, --color-text-muted, tracking wide]
VEJA O KIT EM AÇÃO

[Título da seção]
Engenharia que você vê. Qualidade que você sente.

[Container do vídeo]
(placeholder: frame escuro com reflexo de fogo no inox)

[Texto abaixo do vídeo — opcional]
Cada detalhe é pensado para durar décadas e transformar seu churrasco.
```

**Observações:**
- O embed do vídeo será fornecido depois (URL do YouTube). Preparar o componente para receber a URL como prop.
- No mobile, o vídeo ocupa full-width com 16px de padding lateral.

---

### BLOCO 3 — FAIXA DE CONFIANÇA

**Layout:**
- Fundo: var(--color-bg-secondary)
- Grid horizontal: 4 itens no desktop (row), 2x2 no mobile (grid 2 colunas)
- Cada item: ícone + texto curto
- Estilo glass-card com borda sutil

**Conteúdo (4 cards):**

```
Card 1:
Ícone: Fábrica/Indústria (Lucide: Factory)
Título: Direto da fábrica
Subtítulo: Sem intermediário, preço justo

Card 2:
Ícone: Escudo/Shield (Lucide: ShieldCheck)
Título: 15 anos de garantia
Subtítulo: Confiança na qualidade que fabricamos

Card 3:
Ícone: Régua/Ruler (Lucide: Ruler)
Título: Projeto sob medida
Subtítulo: Feito nas medidas exatas da sua churrasqueira

Card 4:
Ícone: Caminhão (Lucide: Truck)
Título: Frete grátis Sul/Sudeste
Subtítulo: Envio seguro para todo Brasil
```

---

### BLOCO 4 — DIFERENCIAIS (Spec → Benefício)

**Layout:**
- Título centralizado
- Cards em stack vertical no mobile, grid 2 colunas no desktop
- Cada card: ícone à esquerda, título + descrição à direita
- Borda esquerda de 3px em var(--color-accent-primary) em cada card

**Conteúdo:**

```
[Label — uppercase]
POR QUE OLHO NA BRASA

[Título]
Não vendemos churrasqueira. Entregamos o equipamento que seu churrasco merece.

[7 cards de diferenciais:]

1. Fabricação própria
   Cada kit é fabricado na nossa fábrica em Santa Catarina. 
   Sem terceirização, sem intermediário, com controle total de qualidade.

2. Inox 304 alimentício
   O mesmo aço usado em equipamentos hospitalares. 
   Não enferruja, não contamina a carne, resiste a maresia e intempéries.

3. Sob medida para sua churrasqueira
   Cada projeto é construído nas medidas exatas que você informar. 
   Encaixe perfeito, sem gambiarras e sem adaptações.

4. Garantia real de 15 anos
   Uma das maiores garantias do mercado brasileiro. 
   Garantimos porque controlamos cada etapa da fabricação.

5. Suporte suspenso exclusivo
   Mais ergonomia e praticidade. Libera espaço dentro da churrasqueira 
   e facilita a limpeza após o churrasco.

6. Estrutura reforçada — quadro 6mm, varões 5mm
   Aguenta o peso de carnes pesadas e uso intenso sem deformar. 
   Feito para durar décadas, não meses.

7. Instalação especializada
   Para clientes da Grande Florianópolis e litoral de SC, 
   enviamos equipe para instalar na sua churrasqueira.
```

---

### BLOCO 5 — ANTES E DEPOIS (Transformação)

**Layout:**
- Título centralizado
- Carrossel horizontal (swipe no mobile) com 3-4 cards
- Cada card: imagem dividida ao meio (antes/depois) com slider draggable
- Ou se preferir implementação mais simples: duas imagens lado a lado com label "ANTES" / "DEPOIS"

**Conteúdo:**

```
[Label — uppercase]
TRANSFORMAÇÃO REAL

[Título]
Veja o que um Kit Olho na Brasa faz pela sua churrasqueira.

[Cards de antes/depois — imagens serão fornecidas]
Card 1: Churrasqueira de alvenaria sem equipamento → Com Kit Premium instalado
Card 2: Churrasqueira antiga/enferrujada → Com grelhas novas em inox
Card 3: Churrasqueira de obra crua → Kit completo com suporte suspenso

[Texto abaixo]
Mais de 100.000 churrasqueiras transformadas em todo o Brasil.
```

**Observação:** usar imagens placeholder (retângulos escuros com texto "ANTES" e "DEPOIS") até as fotos reais serem inseridas. Deixar fácil de trocar.

---

### BLOCO 6 — COMO FABRICAMOS (Processo de produção)

**Layout:**
- Fundo: var(--color-bg-secondary)
- Timeline horizontal com scroll no mobile (snap scroll)
- Desktop: 6 etapas em linha horizontal com linha conectora
- Mobile: carrossel com dots de navegação
- Cada etapa: círculo numerado + imagem quadrada + título + descrição curta

**Conteúdo:**

```
[Label — uppercase]
POR DENTRO DA FÁBRICA

[Título]
Cada kit passa por dezenas de etapas antes de chegar na sua casa.

[6 etapas da timeline:]

01 — Corte do Inox
     Chapas de Inox 304 cortadas com precisão milimétrica.

02 — Solda especializada
     Solda TIG por profissionais certificados. Acabamento limpo e resistente.

03 — Polimento
     Acabamento escovado premium. Brilho que dura anos sem desbotar.

04 — Montagem
     Cada peça é montada e testada manualmente antes da embalagem.

05 — Inspeção de qualidade
     Verificação final de medidas, acabamento e resistência.

06 — Embalagem segura
     Embalagem reforçada para transporte. Seu kit chega intacto.
```

**Observação:** cada etapa terá uma foto de fábrica (será fornecida). Usar placeholder com fundo --color-bg-card e ícone de câmera. Imagens devem ter aspect-ratio 1:1, border-radius 12px.

---

### BLOCO 7 — GALERIA PREMIUM DE PROJETOS

**Layout (estilo Apple — grid assimétrico):**
- NÃO usar grid uniforme 3x3
- Desktop: primeira imagem grande (span 2 colunas), duas médias lado a lado, outra grande, e assim por diante
- Mobile: carrossel full-width com snap scroll, uma imagem por vez
- Cada imagem: border-radius 12px, leve zoom on hover (scale 1.03)
- Lightbox ao clicar (fullscreen)

**Conteúdo:**

```
[Label — uppercase]
PROJETOS ENTREGUES

[Título]
Galeria de churrasqueiras transformadas.

[6-8 imagens de projetos instalados — serão fornecidas]
Usar placeholders escuros com texto "Projeto 1", "Projeto 2"...

[Cada imagem pode ter overlay sutil no hover com:]
"Kit Premium 80cm — Balneário Camboriú, SC"
```

---

### BLOCO 8 — DEPOIMENTOS DE CLIENTES

**Layout:**
- Carrossel horizontal com snap scroll no mobile
- Cada card: fundo glass-card, padding generoso
- Estrelas (5 estrelas cheias em cor dourada #FFB800)
- Texto do depoimento em itálico
- Nome e cidade do cliente abaixo
- Dots de navegação abaixo do carrossel

**Conteúdo — depoimentos reais dos clientes:**

```
Card 1:
★★★★★
"Supera as expectativas. É outra coisa! Exatamente como na foto, gostamos muito! 
Para quem ficou em dúvida como eu, o cabo realmente não esquenta!"
— Cliente verificado

Card 2:
★★★★★
"O produto chegou antes do esperado, a qualidade é surpreendente. 
O valor foi 1/3 do orçamento que fiz aqui na região e a qualidade é a mesma. 
Estou indicando para todo mundo!"
— Cliente verificado

Card 3:
★★★★★
"Sou churrasqueiro profissional. Sempre tive o problema de depender da estrutura 
do cliente. Essa churrasqueira facilitou muito meu trabalho e o churrasco fica 
muito melhor!"
— Churrasqueiro profissional

Card 4:
★★★★★
"Confiamos tanto na qualidade que oferecemos 15 anos de garantia. 
Os produtos são feitos com qualidade máxima!"
— Olho na Brasa (prova de confiança da marca)
```

**Observação:** O card 4 é da marca — posicioná-lo como o último, com estilo visual levemente diferente (borda accent). Se possível, adicionar espaço para embed de vídeo de depoimento (thumbnail com play button que abre lightbox). Deixar componente preparado para receber URLs de vídeo futuramente.

---

### BLOCO 9 — "PARA QUEM É" (Filtro de ICP)

**Layout:**
- Fundo: var(--color-bg-primary)
- Duas colunas no desktop: coluna esquerda "Para quem é" (verde/positivo), coluna direita "Não é para quem" (vermelho/negativo sutil)
- Mobile: stack vertical, "Para quem é" primeiro

**Conteúdo:**

```
[Título]
O Kit Olho na Brasa é para quem leva o churrasco a sério.

[Coluna positiva — ícone ✓ em verde]
✓ Está construindo ou reformando a churrasqueira
✓ Quer equipamento profissional para uso residencial
✓ Valoriza durabilidade e não quer trocar em 2 anos
✓ Leva o churrasco a sério e recebe família e amigos

[Coluna negativa — ícone ✗ em vermelho muted]
✗ Procura o preço mais baixo do mercado
✗ Quer churrasqueira descartável
✗ Não se importa com qualidade do material
```

---

### BLOCO 10 — FAQ (Perguntas frequentes)

**Layout:**
- Accordion (collapse/expand) 
- Cada pergunta: texto em branco, seta para baixo que gira ao abrir
- Resposta: texto em --color-text-secondary
- Borda bottom sutil entre itens

**Conteúdo:**

```
[Título]
Dúvidas frequentes

Pergunta 1: Como sei se o Kit vai caber na minha churrasqueira?
Resposta: Todos os nossos kits são fabricados sob medida. Você informa as medidas internas da sua churrasqueira (largura e comprimento) e nós fabricamos no tamanho exato. Temos um vídeo com o Rodrigo, dono da fábrica, ensinando como tirar as medidas corretamente. Se tiver dúvida, nossos especialistas ajudam pelo WhatsApp.

Pergunta 2: O inox 304 realmente não enferruja?
Resposta: O Inox 304 é o mesmo aço utilizado em equipamentos hospitalares e na indústria alimentícia. Ele resiste a maresia, chuva e uso intenso. Com o cuidado básico recomendado, seus acessórios vão durar décadas sem sinais de ferrugem — por isso garantimos por 15 anos.

Pergunta 3: Quanto tempo demora a entrega?
Resposta: Como cada kit é fabricado sob medida, o prazo de produção varia de acordo com a demanda. Após a confirmação do pagamento, nosso time informa o prazo atualizado. O frete é grátis para Sul e Sudeste, e enviamos para todo o Brasil com embalagem reforçada.

Pergunta 4: E se eu errar a medida?
Resposta: Nosso time de atendimento confere as medidas junto com você antes de iniciar a fabricação. Enviamos imagem e vídeo explicando exatamente onde medir. Se ainda assim tiver dúvida, nosso especialista orienta por vídeo chamada ou WhatsApp.

Pergunta 5: Posso parcelar?
Resposta: Sim! Oferecemos parcelamento em até 5x sem juros no cartão de crédito. Também temos 5% de desconto no PIX e condições especiais para pagamento à vista.

Pergunta 6: Como funciona a garantia de 15 anos?
Resposta: A garantia cobre defeitos de fabricação e falhas de material por 15 anos a partir da data de entrega. Confiamos tanto na qualidade do que fabricamos que oferecemos uma das maiores garantias do mercado brasileiro.

Pergunta 7: Vocês fazem instalação?
Resposta: Sim! Para clientes da Grande Florianópolis e litoral catarinense (Itapema, Itajaí, Balneário Camboriú, São José), oferecemos serviço de instalação com equipe própria. Para outras regiões, enviamos um guia completo de instalação — é simples e qualquer pessoa consegue instalar.

Pergunta 8: O Kit Premium inclui o quê?
Resposta: O Kit Premium inclui: Grelha Uruguaia Premium (quadro 6mm, varões 5mm), Grelha de Descanso, Suporte Suspenso e Espetos Duplos de brinde. Tudo em Inox 304 alimentício, fabricado sob medida para a sua churrasqueira.
```

---

### BLOCO 11 — CTA FINAL

**Layout:**
- Fundo: gradiente sutil de var(--color-bg-secondary) para var(--color-bg-primary)
- Centralizado, com glow accent atrás
- CTA grande, full-width no mobile

**Conteúdo:**

```
[Título — grande, impactante]
Sua churrasqueira merece um upgrade de verdade.

[Subtítulo]
Projeto sob medida, inox 304 alimentício, garantia de 15 anos.
Fale com um especialista agora.

[CTA principal — mesmo estilo do Hero]
QUERO MEU PROJETO  →

[Linha de confiança abaixo]
🔥 Fábrica própria em SC  •  🛡️ 15 anos de garantia  •  📐 Sob medida
```

---

### FOOTER

**Layout:**
- Fundo: #050505
- Logo Olho na Brasa (centralizado no mobile)
- Links: Site | Instagram | WhatsApp
- CNPJ e razão social
- Copyright

**Conteúdo:**

```
[Logo Olho na Brasa]

Olho na Brasa — Fábrica de grelhas e acessórios premium em inox 304.
Santa Catarina, Brasil.

Instagram: @olhonabrasa
WhatsApp: (47) 4042-0956
Site: www.olhonabrasa.com.br

OLHO NA BRASA LTDA — CNPJ: 43.062.681/0001-25
© 2026 Olho na Brasa. Todos os direitos reservados.
```

---

## POPUP CONSULTIVO (Modal — a peça mais importante)

O popup abre quando o usuário clica em qualquer CTA da página ("QUERO MEU PROJETO" ou similares). Ele é um modal com overlay escuro (rgba(0,0,0,0.8)), centralizado, com max-width 500px e padding generoso. No mobile, ocupa quase 100% da tela com scroll interno.

### ETAPA 1 — Estágio do projeto

```
[Título do modal]
Vamos montar seu projeto 🔥

[Subtítulo]
Em que momento você está?

[3 botões/cards de opção — stack vertical]

Opção A (ícone: Hammer/Wrench):
"Estou construindo ou reformando minha churrasqueira"
→ avança para Etapa 2

Opção B (ícone: CheckCircle):
"Já tenho a churrasqueira pronta, só falta o kit"
→ avança para Etapa 2

Opção C (ícone: Search):
"Ainda estou planejando"
→ pula para Etapa C (rota fria)
```

### ETAPA 2 — Medidas (só para rotas A e B)

```
[Título]
Você já tem as medidas da sua churrasqueira?

[2 botões de opção]

"SIM, já tenho as medidas"
→ expande campos de medida

"NÃO, ainda preciso medir"
→ mostra guia visual + vídeo
```

**Se SIM:**
```
[3 campos numéricos]
Largura interna (cm): [____]
Comprimento interno (cm): [____]
Altura interna (cm) - opcional: [____]

[Abaixo dos campos:]
Imagem ilustrativa mostrando onde medir (será fornecida)
Texto: "Meça por dentro da churrasqueira, de parede a parede."

[Link para vídeo]
▶ Assista ao vídeo do Rodrigo ensinando a medir (2 min)
(abre embed de vídeo inline ou lightbox)

[Botão]
CONTINUAR →
→ avança para Etapa 3
```

**Se NÃO:**
```
[Imagem ilustrativa mostrando onde medir]

[Vídeo embed — thumbnail com play]
▶ Assista ao vídeo do Rodrigo ensinando a medir
"Em 2 minutos você aprende a tirar as medidas certinhas."

[2 opções:]

"Já entendi, vou medir agora"
→ volta para os campos de medida (mostra campos)

"Posso medir depois, quero falar com especialista"
→ avança para Etapa 3 (sem medidas)
```

### ETAPA 3 — Dados de contato (rotas A e B)

```
[Título]
Quase lá! Como podemos te chamar?

[Campos do formulário]
Nome: [____________________]
WhatsApp: [(__) _____-____]   (máscara de telefone brasileiro)
Cidade / Estado: [____________________]

[Botão]
CONTINUAR →
→ avança para Etapa 4
```

### ETAPA 4 — Saída dupla (rotas A e B)

```
[Título]
Tudo certo! Como prefere seguir?

[2 cards de opção — stack vertical:]

Card 1 (destaque principal — borda accent, fundo levemente laranja):
Ícone: WhatsApp (verde)
"Falar agora com um especialista"
"Resposta em minutos no WhatsApp"
→ Abre link WhatsApp:
   https://wa.me/554740420956?text=Olá! Quero montar meu Kit Premium.%0A%0ANome: {nome}%0ACidade: {cidade}%0AMedidas: {largura}x{comprimento}cm%0A%0AVim pela landing page.

Card 2 (opção secundária — borda normal):
Ícone: Clock
"Me chame depois, ainda estou decidindo"
"Um especialista vai te chamar em até 24h"
→ Mostra mensagem de confirmação:
   "Perfeito, {nome}! Nosso time vai te chamar no WhatsApp ({whatsapp}) em até 24h. 
    Fique de olho! 🔥"
   [Botão: Fechar]

Card 3 (última opção — texto simples, sem card):
"Ainda preciso de ajuda com as medidas"
→ Abre WhatsApp com mensagem:
   https://wa.me/554740420956?text=Olá! Quero montar meu Kit Premium, mas preciso de ajuda para definir as medidas da minha churrasqueira.%0A%0ANome: {nome}%0ACidade: {cidade}
```

### ETAPA C — Rota fria ("Ainda estou planejando")

```
[Título]
Sem problema! Enquanto planeja, conheça nossos kits.

[Subtítulo]
Veja os modelos, tamanhos e preços disponíveis no nosso site.

[Card 1 — link externo:]
Ícone: ExternalLink
"Ver kits e preços no site"
→ Abre em nova aba: https://www.olhonabrasa.com.br/kits-premium/

[Card 2 — captura de email:]
Ícone: FileDown
"Baixar guia gratuito de medidas"
"Receba no seu e-mail um PDF com tudo que você precisa saber antes de comprar."

[Se clicar no Card 2:]
Campo: E-mail [____________________]
[Botão: ENVIAR GUIA]
→ Mostra confirmação: "Guia enviado para {email}! Confira sua caixa de entrada. 🔥"

[Texto muted abaixo]
"Quando estiver pronto, volte aqui e fale com nosso especialista."
```

---

## COMPONENTES GLOBAIS

### Botão flutuante de WhatsApp (fixo no mobile)

```
- Posição: fixed, bottom: 20px, right: 20px
- Ícone WhatsApp verde (#25D366) dentro de círculo
- Tamanho: 56px x 56px no mobile, 64px x 64px no desktop
- Box-shadow forte para destacar
- Ao clicar: abre https://wa.me/554740420956?text=Olá! Vim pelo site e quero saber mais sobre o Kit Premium.
- Z-index alto (acima de tudo exceto o modal)
- Leve animação pulse a cada 5 segundos
```

### Header fixo (sticky)

```
- Fundo: rgba(10, 10, 10, 0.95) com backdrop-filter: blur(20px)
- Logo Olho na Brasa à esquerda (será fornecido — usar texto "OLHO NA BRASA" como placeholder)
- CTA à direita: "QUERO MEU PROJETO" (pequeno, estilo outline ou accent)
- Aparece após scroll de ~300px (escondido no hero)
- Altura: 60px no mobile, 72px no desktop
- Z-index abaixo do modal, acima do conteúdo
```

### Navegação por âncoras (smooth scroll)

Ao clicar nos CTAs internos que não são de conversão, fazer smooth scroll até a seção relevante.

---

## REQUISITOS TÉCNICOS

### Mobile-first obrigatório
- Todas as media queries partem do mobile e expandem para desktop (`min-width`)
- Breakpoints: 768px (tablet), 1024px (desktop), 1280px (desktop grande)
- Touch targets mínimo 44px x 44px
- Nenhum texto menor que 14px no mobile
- Carrosséis com scroll-snap e -webkit-overflow-scrolling: touch
- Testar que nenhum conteúdo faz overflow horizontal no mobile (max-width: 100vw)

### Performance
- Imagens: usar loading="lazy" em tudo abaixo do hero
- Fontes: preconnect para Google Fonts, font-display: swap
- Animações: usar `prefers-reduced-motion` para desabilitar animações se o usuário preferir
- Não usar bibliotecas pesadas para animações simples — CSS transitions são suficientes

### Acessibilidade básica
- Contraste mínimo 4.5:1 para texto sobre fundos escuros
- Focus visible em todos os elementos interativos
- Aria-labels nos botões de ícone
- Semântica HTML: `

`, ``, `

`, `

`
- role="dialog" e aria-modal="true" no popup

### SEO
- Title: "Kit Premium para Churrasqueira | Inox 304 Sob Medida | Olho na Brasa"
- Meta description: "Grelha e kit completo em inox 304 para sua churrasqueira. Sob medida, direto da fábrica, com 15 anos de garantia. Frete grátis Sul e Sudeste."
- H1 único no hero
- Alt text descritivo em todas as imagens
- Schema markup: LocalBusiness + Product (se possível)

---

## SOBRE AS IMAGENS

Todas as imagens serão fornecidas posteriormente. Para a primeira versão no Lovable:

1. **Hero (Rodrigo):** usar placeholder escuro (gradiente --color-bg-primary para --color-bg-secondary) com texto "IMAGEM DO RODRIGO COM KIT" centralizado em --color-text-muted
2. **Vídeo:** placeholder escuro com ícone de play centralizado
3. **Antes/Depois:** cards escuros com labels "ANTES" e "DEPOIS"
4. **Processo de fabricação:** 6 quadrados escuros com números 01-06
5. **Galeria:** 6-8 retângulos escuros com texto "Projeto N"
6. **Depoimentos vídeo:** thumbnails escuros com play
7. **Guia de medidas:** placeholder com texto "IMAGEM GUIA DE MEDIDAS"

A estrutura de componentes deve facilitar a troca de placeholders por imagens reais posteriormente (props de src).

---

## CORES DE FUNDO ALTERNADAS ENTRE SEÇÕES

Para criar ritmo visual e separar visualmente as seções:

```
Hero:               --color-bg-primary (#0A0A0A)
Vídeo:              --color-bg-primary (#0A0A0A)
Faixa confiança:    --color-bg-secondary (#111111)
Diferenciais:       --color-bg-primary (#0A0A0A)
Antes/Depois:       --color-bg-secondary (#111111)
Como fabricamos:    --color-bg-primary (#0A0A0A)
Galeria:            --color-bg-secondary (#111111)
Depoimentos:        --color-bg-primary (#0A0A0A)
Para quem é:        --color-bg-secondary (#111111)
FAQ:                --color-bg-primary (#0A0A0A)
CTA Final:          gradiente --color-bg-secondary → --color-bg-primary
Footer:             #050505
```

---

## RESUMO DA ORDEM DOS BLOCOS

1. Hero (Rodrigo + headline + CTA)
2. Vídeo cinematográfico
3. Faixa de confiança (4 cards)
4. Diferenciais (7 items)
5. Antes e Depois (carrossel)
6. Como fabricamos (timeline 6 etapas)
7. Galeria premium (grid assimétrico)
8. Depoimentos de clientes (carrossel)
9. Para quem é (filtro ICP)
10. FAQ (accordion)
11. CTA Final
12. Footer

**Popup consultivo:** acionado por qualquer CTA da página, com fluxo de 4 etapas (qualificação → medidas → contato → saída dupla).

---

## ÚLTIMA INSTRUÇÃO

Use React com Tailwind CSS. Cada bloco deve ser um componente separado. O popup deve gerenciar estado com useState (etapa atual, dados do formulário). Priorize mobile — toda decisão de layout começa pelo mobile e adapta para desktop. O resultado deve parecer um site premium de produto de alto padrão, não um template de e-commerce. Background sempre escuro, texto claro, acentos em laranja fogo.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://olho-na-brasa-premium.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/37b1cb4b-7c3c-45fb-a19a-a867fbb0d6df).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
