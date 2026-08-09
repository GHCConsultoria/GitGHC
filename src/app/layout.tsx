import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
});

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600"],
});

const plexMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-data",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "GitGHC — Conferência de Publicações e Prazos",
  description: "Triagem de publicações e confirmação humana de prazos processuais.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "GitGHC",
  },
};

// userScalable: false trava o pinch-to-zoom -- deliberado para a sensação
// de "app instalado" (PWA) em vez de página web comum; a UI já cuida de
// não depender de zoom pra ser legível (tamanhos de fonte generosos).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0a0b0d",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${jetbrainsMono.variable} ${plexSans.variable} ${plexMono.variable}`}>{children}</body>
    </html>
  );
}
