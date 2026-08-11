import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import { ScriptSemFlashDeTema } from "@/components/layout/ScriptSemFlashDeTema";
import "./globals.css";

// Fonte única pro app inteiro (era IBM Plex Sans no corpo + JetBrains Mono
// nos títulos e nos dados — a mistura lia como "muitas fontes diferentes").
// --font-display e --font-data continuam existindo como aliases pra esta
// mesma fonte (ver body{} em globals.css), pra não precisar tocar os ~40
// lugares que já usam as classes font-display/font-data.
const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Zelo: Conferência de Publicações e Prazos",
  description: "Triagem de publicações e confirmação humana de prazos processuais.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Zelo",
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
  themeColor: "#eef0f3",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={plexSans.variable}>
        <ScriptSemFlashDeTema />
        {children}
      </body>
    </html>
  );
}
