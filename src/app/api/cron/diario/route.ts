import { NextRequest, NextResponse } from "next/server";
import { executarRotinaDiaria } from "@/lib/automacao/rotina-diaria";

// Ingestão de vários escritórios + cálculo + envio de e-mails pode passar do
// timeout padrão de uma function serverless.
export const maxDuration = 300;

/**
 * Alvo do cron da Vercel (ver vercel.json). A Vercel manda
 * `Authorization: Bearer $CRON_SECRET` quando CRON_SECRET está configurado —
 * conferimos isso para que só o próprio cron (ou alguém com o segredo)
 * consiga disparar a rotina.
 */
export async function GET(request: NextRequest) {
  const segredoConfigurado = process.env.CRON_SECRET;
  if (segredoConfigurado) {
    const cabecalhoAutorizacao = request.headers.get("authorization");
    if (cabecalhoAutorizacao !== `Bearer ${segredoConfigurado}`) {
      return NextResponse.json({ erro: "nao autorizado" }, { status: 401 });
    }
  }

  const resultado = await executarRotinaDiaria();
  return NextResponse.json(resultado, { status: resultado.sucesso ? 200 : 500 });
}
