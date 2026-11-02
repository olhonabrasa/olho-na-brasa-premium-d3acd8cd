# LP "Monte seu kit" (Wbuy)

Montador 3D que roda dentro de uma página de conteúdo da Wbuy
(`olhonabrasa.com.br/m/monte-seu-kit/`) e compra pelo carrinho nativo da loja.

- `npm run dev:wbuy`: página de teste em http://localhost:5181 (modo simulado: preços de exemplo, carrinho não é alterado).
- `npm run build:wbuy`: gera `public/wbuy-lp/` (servido por premium.olhonabrasa.com.br/wbuy-lp/).
- `wbuy/pagina-conteudo.html`: o que vai colado no código-fonte da página na Wbuy.

Reaproveita `src/lib/kitComposition.ts` e `src/components/checkout/kit3d/geometry.ts` da LP Premium.
SKUs da loja em `src/catalog.ts`; chamadas da Wbuy (`load-widget.php`, `shop_func.php`) em `src/wbuy.ts`.
