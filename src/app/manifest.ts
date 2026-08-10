import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GitGHC: Conferência de Publicações e Prazos",
    short_name: "GitGHC",
    description: "Triagem de publicações e confirmação humana de prazos processuais.",
    start_url: "/",
    display: "standalone",
    background_color: "#eef0f3",
    theme_color: "#eef0f3",
    icons: [
      { src: "/icon/192", sizes: "192x192", type: "image/png" },
      { src: "/icon/512", sizes: "512x512", type: "image/png" },
    ],
  };
}
