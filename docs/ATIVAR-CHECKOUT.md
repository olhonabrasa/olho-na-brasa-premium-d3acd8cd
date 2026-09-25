# Ativar o checkout Mercado Pago e o painel de rastreamento

Tudo abaixo é feito uma vez. Enquanto não estiver pronto, a LP continua funcionando:
sem a chave pública do MP o configurador mostra o preço e fecha pelo WhatsApp;
sem a migração do banco, o configurador cai no "orçamento sob medida".

Projeto Supabase da LP: **pwpfpseatkwluahjqclc** (o de `src/lib/supabase.ts`).

## 1. Banco de dados (Supabase > SQL Editor)

Cole e rode `supabase/migrations/20260925200000_checkout_tracking_security.sql`. Ele:

- cria `admin_users` e coloca nela **todos os usuários que já existem** no Auth. Depois confira:
  `select * from public.admin_users;` e apague quem não for da equipe;
- troca as regras de acesso de `leads` (só admin lê) e recria `save_lead` com limites;
- tira a listagem pública das fotos do bucket `churrasqueira-fotos`;
- cria catálogo, tabela de preços (70 combinações do Kit Premium + peças avulsas do site),
  configurações da loja, pedidos e rastreamento de sessões.

## 2. Mercado Pago (mercadopago.com.br/developers > Suas integrações)

1. Crie uma aplicação "Pagamentos online" (Checkout Transparente / Bricks).
2. **Credenciais de produção**: copie a *Public key* e o *Access token*.
3. **Webhooks** > Configurar notificações:
   - URL: `https://pwpfpseatkwluahjqclc.supabase.co/functions/v1/mp-webhook`
   - Evento: **Pagamentos**
   - Copie a **assinatura secreta** gerada.
4. Em *Seu negócio > Custos*, ative **parcelamento sem juros até 10x** (a LP anuncia 10x sem juros;
   sem isso o MP cobra juros do cliente nas parcelas).
5. Pix precisa de uma chave Pix cadastrada na conta do Mercado Pago.

## 3. Edge Functions (terminal, na pasta do projeto)

```bash
npx supabase login
npx supabase secrets set --project-ref pwpfpseatkwluahjqclc MP_ACCESS_TOKEN="APP_USR-..." MP_WEBHOOK_SECRET="..." IP_HASH_SALT="uma-frase-aleatoria-longa"
npx supabase functions deploy checkout-order checkout-pay mp-webhook --project-ref pwpfpseatkwluahjqclc --no-verify-jwt
```

Opcional:
- `CRM_WEBHOOK_URL` — recebe um POST quando um pedido é pago (ex.: webhook do DataCrazy);
- `ALLOWED_ORIGINS` — domínios extras que podem criar pedidos (separados por vírgula);
- `PUBLIC_SITE_URL` — padrão `https://premium.olhonabrasa.com.br`.

## 4. Chave pública na LP

Defina a variável de build `VITE_MP_PUBLIC_KEY=APP_USR-...` (a *Public key*, nunca o Access token)
no Lovable (Project settings > Environment) ou no painel da Cloudflare, e publique.

## 5. Teste antes de anunciar

1. Use as credenciais **de teste** primeiro (Public key e Access token `TEST-...`) e os
   [cartões de teste](https://www.mercadopago.com.br/developers/pt/docs/checkout-bricks/additional-content/your-integrations/test/cards).
2. Faça um pedido de ponta a ponta: Pix, cartão aprovado, cartão recusado (`OTHE` no nome) e boleto.
3. No painel (`/painel-leads-9f3k7x2pq8m`) confira: o pedido aparece em **Pedidos**, a sessão em
   **Sessões** com a linha do tempo até "COMPROU", e o status muda para *Pago* sozinho (webhook).
4. Troque para as credenciais de produção e faça um Pix real de valor baixo (ajuste um preço
   temporariamente em **Preços e frete**).

## Onde mexer no dia a dia

Painel > **Preços e frete**: preços do kit por medida, preços das peças, desconto do Pix, parcelas,
prazo de produção, frete por estado (vazio = cliente fecha o frete pelo WhatsApp) e o botão para
pausar o pagamento online.
