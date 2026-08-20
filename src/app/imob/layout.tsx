import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Imobiliária — Gestão",
  description: "Sistema de gestão para imobiliárias: imóveis, leads, contratos, financeiro e comissões.",
};

export default function ImobRootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
