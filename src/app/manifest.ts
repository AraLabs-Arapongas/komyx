import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Festeja - Gestão de Buffet",
    short_name: "Festeja",
    description: "Agenda, reservas, orçamentos, convidados e pagamentos para o seu buffet.",
    start_url: "/home",
    display: "standalone",
    background_color: "#faf7f2",
    theme_color: "#c2410c",
    lang: "pt-BR",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
