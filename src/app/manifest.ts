import type { MetadataRoute } from "next";

// Servido em `/manifest.webmanifest` e cacheado por padrão.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sistema de Torneios",
    short_name: "Torneios",
    description:
      "Sistema de torneios Super 8, Super 10 e Super 12 com tabela, placar e classificação.",
    id: "/dashboard/torneios",
    start_url: "/dashboard/torneios",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#09090b",
    theme_color: "#09090b",
    lang: "pt-BR",
    dir: "ltr",
    categories: ["sports", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
