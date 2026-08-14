import type { ResultadoVisita, Usuario } from "@prisma/client";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BotaoStatusPasso } from "@/components/crm/BotaoStatusPasso";
import { EtiquetaEstagio } from "@/components/crm/EtiquetaEstagio";
import { FormularioProximoPasso } from "@/components/crm/FormularioProximoPasso";
import { FormularioVisita } from "@/components/crm/FormularioVisita";
import { GestaoEstagioLead } from "@/components/crm/GestaoEstagioLead";
import { obterUsuarioAtual, UsuarioNaoAutenticadoError, UsuarioNaoCadastradoError } from "@/lib/auth";
import { formatarDiaBR, situacaoPasso } from "@/lib/crm/atividade";
import { buscarLeadPorId, buscarMotivosPerdaAtivos } from "@/lib/crm/consultas";
import { ROTULO_ORIGEM } from "@/lib/crm/funil";
import { formatarMoeda } from "@/lib/crm/moeda";

export const dynamic = "force-dynamic";

const ROTULO_RESULTADO: Record<ResultadoVisita, string> = {
  REALIZADA: "Realizada",
  REMARCADA: "Remarcada",
  NAO_COMPARECEU: "Não compareceu",
  CANCELADA: "Cancelada",
};

const CLASSE_SITUACAO: Record<string, string> = {
  vencido: "text-urgent",
  hoje: "text-attention",
  futuro: "text-ink-faint",
};

const ROTULO_SITUACAO: Record<string, string> = {
  vencido: "vencido",
  hoje: "hoje",
  futuro: "agendado",
};

export default async function DetalheLead({ params }: { params: { id: string } }) {
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

  const [lead, motivos] = await Promise.all([
    buscarLeadPorId(params.id, usuario.escritorioId),
    buscarMotivosPerdaAtivos(usuario.escritorioId),
  ]);
  if (!lead) notFound();

  const agora = new Date();
  const local = [lead.cidade, lead.uf].filter(Boolean).join("/");
  const contato = [lead.contatoNome, lead.contatoCargo].filter(Boolean).join(" · ");

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-10 px-6 py-10 sm:px-10 sm:py-14">
      <header>
        <Link href="/crm/leads" className="text-sm text-ink-soft transition-colors hover:text-brass">
          ← voltar para os leads
        </Link>
        <div className="mt-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow mb-2">{lead.nicho}</p>
            <h1 className="font-display text-4xl">{lead.nomeEmpresa}</h1>
          </div>
          <EtiquetaEstagio estagio={lead.estagio} />
        </div>
        <dl className="mt-4 grid grid-cols-1 gap-x-8 gap-y-1 text-sm text-ink-soft sm:grid-cols-2">
          {contato && (
            <div>
              <dt className="inline text-ink-faint">Contato: </dt>
              <dd className="inline">{contato}</dd>
            </div>
          )}
          {lead.telefone && (
            <div>
              <dt className="inline text-ink-faint">Telefone: </dt>
              <dd className="inline font-data">{lead.telefone}</dd>
            </div>
          )}
          {lead.email && (
            <div>
              <dt className="inline text-ink-faint">E-mail: </dt>
              <dd className="inline">{lead.email}</dd>
            </div>
          )}
          {(local || lead.endereco) && (
            <div>
              <dt className="inline text-ink-faint">Local: </dt>
              <dd className="inline">{[lead.endereco, local].filter(Boolean).join(" — ")}</dd>
            </div>
          )}
          <div>
            <dt className="inline text-ink-faint">Origem: </dt>
            <dd className="inline">{ROTULO_ORIGEM[lead.origem]}</dd>
          </div>
          {lead.estagio === "GANHO" && lead.valorFechadoCentavos != null && (
            <div>
              <dt className="inline text-ink-faint">Valor fechado: </dt>
              <dd className="inline font-data text-calm">{formatarMoeda(lead.valorFechadoCentavos)}</dd>
            </div>
          )}
          {lead.estagio !== "GANHO" && lead.valorPotencialCentavos != null && (
            <div>
              <dt className="inline text-ink-faint">Valor potencial: </dt>
              <dd className="inline font-data">{formatarMoeda(lead.valorPotencialCentavos)}</dd>
            </div>
          )}
          {lead.estagio === "PERDIDO" && lead.motivoPerda && (
            <div className="sm:col-span-2">
              <dt className="inline text-ink-faint">Motivo da perda: </dt>
              <dd className="inline text-urgent">
                {lead.motivoPerda.descricao}
                {lead.detalhePerda && ` — ${lead.detalhePerda}`}
              </dd>
            </div>
          )}
        </dl>
      </header>

      <section>
        <h2 className="eyebrow mb-4 rule pt-6">Situação no funil</h2>
        <GestaoEstagioLead
          leadId={lead.id}
          estagioAtual={lead.estagio}
          motivos={motivos.map((m) => ({ id: m.id, descricao: m.descricao }))}
        />
      </section>

      <section>
        <h2 className="eyebrow mb-4 rule pt-6">Próximos passos</h2>
        <div className="flex flex-col gap-4">
          <FormularioProximoPasso leadId={lead.id} />
          {lead.proximosPassos.length === 0 ? (
            <p className="text-sm text-ink-faint">Nenhum próximo passo definido.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {lead.proximosPassos.map((passo) => {
                const sit = situacaoPasso(passo, agora);
                const concluido = passo.status === "CONCLUIDO";
                const cancelado = passo.status === "CANCELADO";
                return (
                  <li
                    key={passo.id}
                    className="paper-card flex flex-wrap items-center justify-between gap-2 rounded-sm px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className={`text-sm ${concluido || cancelado ? "text-ink-faint line-through" : "text-ink"}`}>
                        {passo.descricao}
                      </p>
                      <p className="text-xs text-ink-faint">
                        {formatarDiaBR(passo.dataPrevista)}
                        {sit && <span className={`ml-2 ${CLASSE_SITUACAO[sit]}`}>· {ROTULO_SITUACAO[sit]}</span>}
                        {concluido && <span className="ml-2 text-calm">· concluído</span>}
                        {cancelado && <span className="ml-2">· cancelado</span>}
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      {passo.status === "PENDENTE" ? (
                        <>
                          <BotaoStatusPasso passoId={passo.id} acao="CONCLUIR" rotulo="Concluir" tom="calm" />
                          <BotaoStatusPasso passoId={passo.id} acao="CANCELAR" rotulo="Cancelar" />
                        </>
                      ) : (
                        <BotaoStatusPasso passoId={passo.id} acao="REABRIR" rotulo="Reabrir" />
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <section>
        <h2 className="eyebrow mb-4 rule pt-6">Histórico de visitas</h2>
        <div className="flex flex-col gap-4">
          <FormularioVisita leadId={lead.id} />
          {lead.visitas.length === 0 ? (
            <p className="text-sm text-ink-faint">Nenhuma visita registrada.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {lead.visitas.map((visita) => (
                <li key={visita.id} className="paper-card rounded-sm px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-data text-sm text-ink">{formatarDiaBR(visita.dataVisita)}</p>
                    <span className="text-xs text-ink-soft">{ROTULO_RESULTADO[visita.resultado]}</span>
                  </div>
                  {visita.local && <p className="mt-1 text-sm text-ink-soft">{visita.local}</p>}
                  {visita.anotacoes && (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-ink-soft">{visita.anotacoes}</p>
                  )}
                  {visita.registradoPor && (
                    <p className="mt-1 text-xs text-ink-faint">por {visita.registradoPor.nome}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
