import { ImageResponse } from "next/og";

export const runtime = "edge";

/**
 * Ícone gerado em tempo de build via next/og (sem depender de sharp/ImageMagick,
 * indisponíveis neste ambiente) — usado pelo manifest.ts (PWA) e por
 * icon.tsx/apple-icon.tsx. Tamanhos suportados: qualquer inteiro, mas só
 * 32/180/192/512 são referenciados de verdade no resto do app.
 */
export async function GET(_request: Request, context: { params: { size: string } }) {
  const tamanho = Number(context.params.size) || 192;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0b0d",
        }}
      >
        <span
          style={{
            color: "#22d3ee",
            fontSize: tamanho * 0.56,
            fontWeight: 700,
            fontFamily: "monospace",
            letterSpacing: -2,
          }}
        >
          G
        </span>
      </div>
    ),
    { width: tamanho, height: tamanho },
  );
}
