import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: "var(--color-paper)",
          raised: "var(--color-paper-raised)",
        },
        ink: {
          DEFAULT: "var(--color-ink)",
          soft: "var(--color-ink-soft)",
          faint: "var(--color-ink-faint)",
        },
        rule: "var(--color-rule)",
        brass: {
          DEFAULT: "var(--color-brass)",
          deep: "var(--color-brass-deep)",
          on: "var(--color-on-brass)",
        },
        urgent: {
          DEFAULT: "var(--color-urgent)",
          bg: "var(--color-urgent-bg)",
          line: "var(--color-urgent-line)",
        },
        attention: {
          DEFAULT: "var(--color-attention)",
          bg: "var(--color-attention-bg)",
          line: "var(--color-attention-line)",
        },
        calm: {
          DEFAULT: "var(--color-calm)",
          bg: "var(--color-calm-bg)",
          line: "var(--color-calm-line)",
        },
        sheipe: {
          DEFAULT: "var(--color-sheipe)",
          deep: "var(--color-sheipe-deep)",
          on: "var(--color-on-sheipe)",
        },
      },
      fontFamily: {
        // As três variáveis apontam pra fonte única (ver layout.tsx) — os
        // nomes de classe (font-display/font-data) ficam só por não exigir
        // trocar ~40 usos espalhados pelo app; o que muda é o que carrega
        // dentro da variável CSS.
        display: ["var(--font-display)", "ui-sans-serif", "sans-serif"],
        body: ["var(--font-body)", "ui-sans-serif", "sans-serif"],
        data: ["var(--font-data)", "ui-sans-serif", "sans-serif"],
      },
      borderRadius: {
        // rounded-sm é o raio padrão de card/botão/input no app inteiro —
        // aumentar aqui, num lugar só, deixa tudo mais arredondado (estilo
        // dashboard SaaS moderno) sem precisar tocar cada componente.
        sm: "0.625rem",
      },
    },
  },
  plugins: [],
};
export default config;
