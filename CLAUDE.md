# Olho na Brasa — LP "Monte seu kit" (Wbuy)

Leia também o `AGENTS.md` (repositório ligado ao Lovable: nunca reescrever histórico já publicado).

## Onde está cada coisa

- Código-fonte da LP: `wbuy-lp/src/` (TypeScript puro + three.js, sem framework), no `main`,
  junto do build. `main.ts` só liga as partes; as dobras estão em `dobras.ts` e `interacoes.ts`;
  o montador em `configurador/` (um arquivo por passo, o 3D e as cotas em `configurador/palco/`);
  as duas cenas ("Kit Premium" e "Montar o meu": passos, instalações, churrasqueiras, modo de
  preço) em `data/cenas.ts`; movimento em `motion/`; cores, fontes, medidas e curvas só em
  `styles/tokens.css`.
- Build: `npm run build:wbuy` gera `public/wbuy-lp/` (kit-builder.js + chunk do palco + `img/`).
  O build vai commitado; o merge no `main` publica pelo Cloudflare Pages em
  `https://premium.olhonabrasa.com.br/wbuy-lp/`.
- Testes: `npm run test:wbuy` (Playwright com o Chrome da máquina, 390×844 / 768×1024 /
  1440×900; `regressao.spec.ts` compara pixels e `auditoria.spec.ts` confere nada sobre o 3D,
  Comprar livre, cartões entre palco e barra, contraste com axe-core, CLS e a cota acompanhando a
  régua, também sem "reduzir movimento" nos projetos `*-movimento`). Capturas em
  `wbuy-lp/tests/capturas/`; só se atualizam (`--update-snapshots`) quando a mudança visual é
  intencional, e só são comparadas na máquina de referência (Chrome no Windows): no CI
  (`process.env.CI`) o antialiasing de fonte do Linux muda 1 a 5 % dos pixels, então lá as
  comparações ficam desligadas (`ignoreSnapshots`) e valem os testes funcionais, a auditoria e o
  Lighthouse. `LP_AO_VIVO=1` liga `ao-vivo.spec.ts` contra a loja real.
- Orçamento: `npm run orcamento:wbuy` (bundle ≤ 350 KB gzip, textura ≤ 600 KB) e, depois do
  build, `npm run lh:wbuy` (Lighthouse CI no build de verdade servido com gzip por
  `wbuy-lp/scripts/servir-build.mjs`: CLS < 0,1, scripts ≤ 350 KB). O workflow
  `.github/workflows/wbuy-lp.yml` roda tudo nos PRs que tocam a LP.
- Modo simulado: fora de `olhonabrasa.com.br` e da prévia `olhonabrasa.lojawbuy.com.br` (esta atrás
  da flag de build `VITE_PREVIA_WBUY`, ligada por padrão). `?simulado=1` força o simulado em
  qualquer host.
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
- O render escapa aspas simples dentro de `<style>` para `&apos;`: nunca usar aspas simples ali
  (`url()` sempre sem aspas).

## Fluxo de trabalho

- Uma Issue por tarefa, um PR por entrega, base `main`. O PR diz: Issue, o que mudou, como
  validou, riscos, limitações e próximos passos, e fecha a Issue com `Closes #N` ("Fecha #N" não
  aciona o fechamento automático).
- O merge é humano (o app bloqueia `gh pr merge`).
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
