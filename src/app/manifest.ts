import type { MetadataRoute } from "next";

// PWA: instalar na tela inicial do celular. Sem modo offline de propósito (o painel depende do banco).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OS oconteudo",
    short_name: "OS oconteudo",
    description: "Painel interno da oconteudo.",
    start_url: "/hoje",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fffefa",
    theme_color: "#14081f",
    lang: "pt-BR",
    icons: [
      { src: "/icones/icone-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icones/icone-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icones/icone-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
