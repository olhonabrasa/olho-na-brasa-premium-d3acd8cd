# Olho na Brasa — LP "Monte seu kit" (Wbuy)

Leia também o `AGENTS.md` (repositório ligado ao Lovable: nunca reescrever histórico já publicado).

## Onde está cada coisa

- Código-fonte da LP: `wbuy-lp/src/` (TypeScript puro + three.js, sem framework). Vive na branch
  `feat/wbuy-lp`; o `main` só recebe o build.
- Build: `npm run build:wbuy` gera `public/wbuy-lp/` (kit-builder.js + chunk do palco + `img/`).
  Deploy = copiar `public/wbuy-lp/` para o `main` do repositório, que o Cloudflare Pages serve em
  `https://premium.olhonabrasa.com.br/wbuy-lp/`.
- Página de teste: `npm run dev:wbuy` (http://localhost:5181, modo simulado: preços de exemplo,
  carrinho não muda). Mídia nova só aparece depois de build + reiniciar o dev server.
- O que vai colado na Wbuy: `wbuy-lp/wbuy/pagina-conteudo.html` (página de conteúdo ID 29577,
  https://www.olhonabrasa.com.br/m/monte-seu-kit/).

## Restrições da Wbuy

- O editor filtra HTML: `<link rel=stylesheet>` é removido e `<script src>` perde o `src`. Fonte só
  por `@import` dentro de `<style>`; o único script entra em "Scripts adicionais", com as tags
  `<script type="module" src=...>` escritas.
- O conteúdo da página é só `<style>` + `<div id="onb-kit-lp">`. Todo o resto vem do bundle.
- Cache de 5 min no domínio final; 1 min em `olhonabrasa.lojawbuy.com.br`, que hoje cai em "modo
  simulado" porque não está na lista de hosts do builder.
- O tema fixa todo `<header>` e tem um chat flutuante (`#lb-widget-container`, z-index 9999).

## Fluxo de trabalho

- Uma Issue por tarefa, um PR por entrega. O PR diz: Issue, o que mudou, como validou, riscos,
  limitações e próximos passos.
- PRs têm `feat/wbuy-lp` como base. Depois do merge, o build vai para o `main`.
- Toda publicação na WBuy espera 5 minutos de cache antes da conferência.

## Configurador 3D (aba "Monte o seu")

- Um componente, KitConfigurador, com modos premium e livre. Nunca duplicar.
- Sobre o 3D só podem existir as cotas A e B, e só no passo de medidas.
- O botão Comprar nunca pode ser coberto; o WhatsApp some enquanto a aba está na viewport.
- Produto na tela no primeiro quadro da aba, com preço já preenchido (70×60).
- Celular: palco preso em clamp(260px, 42svh, 380px); cada passo cabe em 418px; se não couber,
  corta-se conteúdo do passo, nunca o palco.
- Cores só por tokens.css (Carvão, Brasa, Brasa clara, Inox, Branco osso).
- Prévia: olhonabrasa.lojawbuy.com.br precisa estar na lista de hosts, senão o builder entra em
  modo simulado.

## Decisões de conteúdo (confirmadas em 01/11/2026)

- Kit Premium: 1 espeto duplo + 1 espeto simples (barra chata), ambos de 80 cm.
- Parcelamento: até 10x sem juros.
