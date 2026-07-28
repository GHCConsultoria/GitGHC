import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gerarFeedIcs } from "@/lib/calendario/ics";

// Quem busca isto é o Google Calendar/Outlook (polling periódico deles, sem
// cookie de sessão nenhum) — a autorização é só o token na própria URL, por
// isso não pode ser pré-renderizada nem cacheada por engano.
export const dynamic = "force-dynamic";

/**
 * Feed ICS público (autenticado só pelo token na URL) com os prazos
 * CONFIRMADOS do escritório dono do token — propositalmente não inclui
 * prazos ainda PENDENTE_CONFIRMACAO, que podem mudar ou ser descartados
 * antes de virarem um compromisso de verdade.
 */
export async function GET(_request: NextRequest, context: { params: { token: string } }) {
  const { token } = context.params;

  const escritorio = await prisma.escritorio.findUnique({ where: { calendarioFeedToken: token } });
  if (!escritorio) {
    return new NextResponse("link não encontrado ou revogado", { status: 404 });
  }

  const prazos = await prisma.prazo.findMany({
    where: { status: "CONFIRMADO", processo: { escritorioId: escritorio.id } },
    include: { processo: true },
    orderBy: { dataFatal: "asc" },
  });

  const corpo = gerarFeedIcs(
    `${escritorio.nome} — Prazos`,
    prazos.map((prazo) => ({
      id: prazo.id,
      dataFatal: prazo.dataFatal,
      tipoAto: prazo.tipoAto,
      descricao: prazo.descricao,
      cliente: prazo.processo.cliente,
      numeroCnj: prazo.processo.numeroCnj,
      varaOrgao: prazo.processo.varaOrgao,
    })),
  );

  return new NextResponse(corpo, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="prazos.ics"',
      "Cache-Control": "no-store",
    },
  });
}
