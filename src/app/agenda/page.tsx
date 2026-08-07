import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obterUsuarioAtual, UsuarioNaoAutenticadoError } from "@/lib/auth";
import { paraDataCalendarioSaoPaulo } from "@/lib/prazos/calculo";
import { podeConfirmarPrazos } from "@/lib/permissoes";
import { PainelAgendaSemana, type ItemAgenda } from "@/components/prazos/PainelAgendaSemana";

export const dynamic = "force-dynamic";

const MS_POR_DIA = 24 * 60 * 60 * 1000;

function chaveDia(data: Date): string {
  return data.toISOString().slice(0, 10);
}

/** Segunda-feira da semana que contém `data` — dataFatal é dia-calendário (UTC meia-noite), então getUTCDay() dá o dia da semana certo sem conversão de fuso. */
function segundaDaSemana(data: Date): Date {
  const diaSemana = data.getUTCDay();
  const deslocamento = diaSemana === 0 ? -6 : 1 - diaSemana;
  const resultado = new Date(data.getTime());
  resultado.setUTCDate(resultado.getUTCDate() + deslocamento);
  return resultado;
}

/** Agenda interna: visão semanal dos prazos ativos, com arrastar-e-soltar para reagendar (ver PainelAgendaSemana). */
export default async function PaginaAgenda({ searchParams }: { searchParams: { inicio?: string } }) {
  let usuario;
  try {
    usuario = await obterUsuarioAtual();
  } catch (erro) {
    if (erro instanceof UsuarioNaoAutenticadoError) redirect("/login");
    throw erro;
  }

  const hoje = paraDataCalendarioSaoPaulo(new Date());
  const baseData =
    searchParams.inicio && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.inicio)
      ? new Date(`${searchParams.inicio}T00:00:00.000Z`)
      : hoje;
  const inicioSemana = segundaDaSemana(baseData);
  const fimSemana = new Date(inicioSemana.getTime() + 6 * MS_POR_DIA);

  const diasChave = Array.from({ length: 7 }, (_, indice) => chaveDia(new Date(inicioSemana.getTime() + indice * MS_POR_DIA)));

  const prazos = await prisma.prazo.findMany({
    where: {
      processo: { escritorioId: usuario.escritorioId },
      status: { in: ["PENDENTE_CONFIRMACAO", "CONFIRMADO", "CUMPRIDO"] },
      dataFatal: { gte: inicioSemana, lte: fimSemana },
    },
    include: { processo: true },
    orderBy: { dataFatal: "asc" },
  });

  const itens: ItemAgenda[] = prazos.map((prazo) => ({
    id: prazo.id,
    publicacaoId: prazo.publicacaoId,
    status: prazo.status,
    tipoAto: prazo.tipoAto,
    cliente: prazo.processo.cliente,
    numeroCnj: prazo.processo.numeroCnj,
    dataChave: chaveDia(prazo.dataFatal),
  }));

  const semanaAnterior = chaveDia(new Date(inicioSemana.getTime() - 7 * MS_POR_DIA));
  const semanaSeguinte = chaveDia(new Date(inicioSemana.getTime() + 7 * MS_POR_DIA));
  const semanaAtual = chaveDia(hoje);

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-6 py-10 sm:px-10 sm:py-14">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/" className="text-sm text-ink-soft transition-colors hover:text-brass">
            ← Voltar
          </Link>
          <p className="eyebrow mb-1 mt-4">Agenda interna</p>
          <h1 className="font-display text-3xl leading-tight">
            Semana de {diasChave[0].split("-").reverse().join("/")} a {diasChave[6].split("-").reverse().join("/")}
          </h1>
        </div>
        <nav className="flex items-center gap-4 text-sm">
          <Link href={`/agenda?inicio=${semanaAnterior}`} className="text-ink-soft transition-colors hover:text-brass">
            ← Semana anterior
          </Link>
          <Link href={`/agenda?inicio=${semanaAtual}`} className="text-ink-soft transition-colors hover:text-brass">
            Hoje
          </Link>
          <Link href={`/agenda?inicio=${semanaSeguinte}`} className="text-ink-soft transition-colors hover:text-brass">
            Próxima semana →
          </Link>
        </nav>
      </header>

      <PainelAgendaSemana diasChave={diasChave} itens={itens} podeReagendar={podeConfirmarPrazos(usuario)} />
    </main>
  );
}
