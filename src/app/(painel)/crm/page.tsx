import type { Usuario } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PainelBI } from "@/components/crm/PainelBI";
import { obterUsuarioAtual, UsuarioNaoAutenticadoError, UsuarioNaoCadastradoError } from "@/lib/auth";
import { situacaoPasso, visitasPorDia } from "@/lib/crm/atividade";
import { buscarLeadsParaBI, buscarProximosPassosPendentes, buscarVisitasDesde } from "@/lib/crm/consultas";
import { calcularFunil, calcularMetricas, desempenhoPorNicho, rankingMotivosPerda } from "@/lib/crm/funil";

export const dynamic = "force-dynamic";

const JANELA_VISITAS_DIAS = 14;

export default async function CrmDashboard() {
  let usuario: Usuario;
  try {
    usuario = await obterUsuarioAtual();
  } catch (erro) {
    if (erro instanceof UsuarioNaoAutenticadoError) redirect("/login");
    if (erro instanceof UsuarioNaoCadastradoError) {
      return (
        <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-3 p-6 text-center">
          <p className="eyebrow">Conta sem acesso</p>
          <h1 className="font-display text-2xl">Seu login foi reconhecido, mas falta um cadastro</h1>
          <p className="text-sm text-ink-soft">Peça para o administrador te cadastrar.</p>
        </main>
      );
    }
    throw erro;
  }

  const agora = new Date();
  const desde = new Date(agora);
  desde.setDate(desde.getDate() - JANELA_VISITAS_DIAS);

  const [leads, visitas, passos] = await Promise.all([
    buscarLeadsParaBI(usuario.escritorioId),
    buscarVisitasDesde(usuario.escritorioId, desde),
    buscarProximosPassosPendentes(usuario.escritorioId),
  ]);

  const metricas = calcularMetricas(leads);
  const funil = calcularFunil(leads);
  const motivos = rankingMotivosPerda(leads);
  const nichos = desempenhoPorNicho(leads);
  const serieVisitas = visitasPorDia(visitas, JANELA_VISITAS_DIAS, agora);

  const vencidos = passos.filter((p) => situacaoPasso(p, agora) === "vencido").length;
  const paraHoje = passos.filter((p) => situacaoPasso(p, agora) === "hoje").length;

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-10 px-6 py-10 sm:px-10 sm:py-14">
      <header>
        <p className="eyebrow mb-2">CRM comercial</p>
        <h1 className="font-display text-4xl">Painel de vendas</h1>
        <p className="mt-2 max-w-xl text-sm text-ink-soft">
          Visão geral da prospecção: funil, conversão, visitas em campo e por que os negócios avançam ou caem.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link
            href="/crm/leads"
            className="rounded-sm bg-brass px-4 py-2 font-medium text-brass-on shadow-sm transition-colors hover:bg-brass-deep"
          >
            Ver leads
          </Link>
          <Link
            href="/crm/agenda"
            className="rounded-sm border border-rule bg-paper px-4 py-2 font-medium text-ink-soft transition-colors hover:text-ink"
          >
            Agenda comercial
            {(vencidos > 0 || paraHoje > 0) && (
              <span className="ml-2 rounded-full bg-urgent-bg px-2 py-0.5 text-xs text-urgent tabular-nums">
                {vencidos + paraHoje}
              </span>
            )}
          </Link>
        </div>
      </header>

      <PainelBI metricas={metricas} funil={funil} visitas={serieVisitas} motivos={motivos} nichos={nichos} />
    </main>
  );
}
