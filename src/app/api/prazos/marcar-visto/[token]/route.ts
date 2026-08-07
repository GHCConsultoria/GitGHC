import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verificarTokenMarcarVisto } from "@/lib/prazos/token-visto";

// Quem clica isto vem do botão do WhatsApp, sem sessão nenhuma — a
// autorização é só o token assinado na própria URL (ver token-visto.ts).
export const dynamic = "force-dynamic";

function paginaHtml(titulo: string, mensagem: string): string {
  return `<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8" /><title>${titulo}</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  body { font-family: system-ui, sans-serif; background: #14110f; color: #f2ede3; display: flex;
    align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 24px; text-align: center; }
  main { max-width: 24rem; }
  h1 { font-size: 1.25rem; margin-bottom: 0.5rem; }
  p { color: #b8ada0; font-size: 0.95rem; }
</style>
</head>
<body><main><h1>${titulo}</h1><p>${mensagem}</p></main></body>
</html>`;
}

/** Marca visualizadoEm no Prazo — não é confirmação, só sinaliza que o alerta de WhatsApp foi visto. */
export async function GET(_request: NextRequest, context: { params: { token: string } }) {
  const prazoId = await verificarTokenMarcarVisto(context.params.token);
  if (!prazoId) {
    return new NextResponse(paginaHtml("Link inválido", "Este link expirou ou não é válido."), {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const prazo = await prisma.prazo.findUnique({ where: { id: prazoId } });
  if (!prazo) {
    return new NextResponse(paginaHtml("Prazo não encontrado", "Este prazo não existe mais."), {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  if (!prazo.visualizadoEm) {
    await prisma.prazo.update({ where: { id: prazoId }, data: { visualizadoEm: new Date() } });
  }

  return new NextResponse(
    paginaHtml("Marcado como visto", "Obrigado — o painel já sabe que você viu este alerta. Nada foi confirmado."),
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}
