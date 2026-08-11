import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Zelo: Conferência de Publicações e Prazos",
    short_name: "Zelo",
    description: "Triagem de publicações e confirmação humana de prazos processuais.",
    start_url: "/",
    display: "standalone",
    background_color: "#eef0f3",
    theme_color: "#eef0f3",
    icons: [
      { src: "/icons/zelo-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/zelo-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
