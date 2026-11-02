import { createFileRoute } from "@tanstack/react-router";
import { AdminApp } from "@/components/admin/AdminApp";

export const Route = createFileRoute("/painel-leads-9f3k7x2pq8m")({
  ssr: false,
  component: AdminApp,
  head: () => ({
    meta: [
      { title: "Painel · LP Premium" },
      { name: "robots", content: "noindex, nofollow, noarchive" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
});
