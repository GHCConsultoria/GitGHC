import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NoSheipe",
  description: "Painel do nutricionista e registro de refeições — NoSheipe.",
};

export default function NutriRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
