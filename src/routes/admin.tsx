import { createFileRoute, redirect } from "@tanstack/react-router";

// O painel antigo ficava num endereço previsível (/admin). Tudo foi unificado no
// painel com URL não-listada; aqui só devolvemos para a página inicial.
export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
  head: () => ({ meta: [{ name: "robots", content: "noindex, nofollow" }] }),
});
