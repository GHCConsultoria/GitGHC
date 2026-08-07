import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { obterUsuarioAtual, UsuarioNaoAutenticadoError } from "@/lib/auth";
import { buscarPublicacaoDetalhada, buscarHistoricoPublicacao } from "@/lib/prazos/fila";
import { formatarDataCalendario, formatarDataHora } from "@/lib/formatacao";
import { BotaoConfirmarPrazo } from "@/components/publicacoes/BotaoConfirmarPrazo";

export const dynamic = "force-dynamic";

/**
 * Central da publicação: visão completa de uma publicação — texto integral
 * (sem truncar, ao contrário dos cards da lista), processo vinculado, o(s)
 * prazo(s) gerados a partir dela (com o passo a passo do cálculo) e o
 * histórico de auditoria completo.
 */
export default async function PaginaPublicacao({ params }: { params: { id: string } }) {
  let usuario;
  try {
    usuario = await obterUsuarioAtual();
  } catch (erro) {
    if (erro instanceof UsuarioNaoAutenticadoError) redirect("/login");
    throw erro;
  }

  const publicacao = await buscarPublicacaoDetalhada(params.id);
  if (!publicacao) notFound();
  // Publicações ainda não vinculadas (NAO_IDENTIFICADA) não têm processo, logo
  // não têm escritório ainda — ficam visíveis a qualquer usuário logado, mesmo
  // padrão de buscarPublicacoesNaoIdentificadas(). Uma vez vinculada, só o
  // escritório dono do processo pode ver.
  if (publicacao.processo && publicacao.processo.escritorioId !== usuario.escritorioId) {
    notFound();
  }

  const prazoIds = publicacao.prazos.map((prazo) => prazo.id);
  const historico = await buscarHistoricoPublicacao(publicacao.id, prazoIds);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-10 px-6 py-10 sm:px-10 sm:py-14">
      <header>
        <Link href="/" className="text-sm text-ink-soft transition-colors hover:text-brass">
          ← Voltar
        </Link>
        <p className="eyebrow mt-4">Central da publicação</p>
        <h1 className="font-display mt-1 text-3xl leading-tight">
          {publicacao.processo ? publicacao.processo.cliente : "Publicação não identificada"}
        </h1>
        {publicacao.processo && (
          <p className="mt-1 font-data text-sm text-ink-faint">
            {publicacao.processo.numeroCnj} · {publicacao.processo.tribunal}/{publicacao.processo.uf}
          </p>
        )}
      </header>

      <section>
        <h2 className="eyebrow mb-3">Texto original</h2>
        <div className="paper-card rounded-sm p-5">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{publicacao.conteudo}</p>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 border-t border-rule pt-4 sm:grid-cols-3">
            <div>
              <dt className="eyebrow mb-1">Disponibilização</dt>
              <dd className="font-data text-sm">{formatarDataCalendario(publicacao.dataDisponibilizacao)}</dd>
            </div>
            <div>
              <dt className="eyebrow mb-1">Fonte</dt>
              <dd className="text-sm">{publicacao.fonte}</dd>
            </div>
            <div>
              <dt className="eyebrow mb-1">Status</dt>
              <dd className="text-sm">{publicacao.status}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section>
        <h2 className="eyebrow mb-3">Prazo{publicacao.prazos.length !== 1 ? "s" : ""} gerado{publicacao.prazos.length !== 1 ? "s" : ""}</h2>
        {publicacao.prazos.length === 0 ? (
          <p className="paper-card rounded-sm px-5 py-6 text-center text-sm text-ink-faint">
            Nenhum prazo calculado para esta publicação ainda.
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {publicacao.prazos.map((prazo) => (
              <li key={prazo.id} className="paper-card rounded-sm border-l-[3px] border-l-brass p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-ink">{prazo.tipoAto}</p>
                    <p className="mt-0.5 text-xs text-ink-soft">{prazo.descricao}</p>
                  </div>
                  <span className="font-display text-lg leading-none text-brass">
                    {formatarDataCalendario(prazo.dataFatal)}
                  </span>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
                  <div>
                    <dt className="eyebrow mb-1">Status</dt>
                    <dd className="text-sm">{prazo.status}</dd>
                  </div>
                  <div>
                    <dt className="eyebrow mb-1">Prazo</dt>
                    <dd className="font-data text-sm">
                      {prazo.diasPrazo} {prazo.contagemDiasUteis ? "dias úteis" : "dias corridos"}
                    </dd>
                  </div>
                  <div>
                    <dt className="eyebrow mb-1">Responsável</dt>
                    <dd className="text-sm">{prazo.responsavel?.nome ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="eyebrow mb-1">Confirmado por</dt>
                    <dd className="text-sm">{prazo.confirmadoPor?.nome ?? "—"}</dd>
                  </div>
                </dl>

                {Array.isArray(prazo.detalhesCalculo) && prazo.detalhesCalculo.length > 0 && (
                  <ol className="mt-4 space-y-1.5 border-t border-rule pt-4 text-xs text-ink-soft">
                    {(prazo.detalhesCalculo as Array<{ descricao: string; data: string }>).map((passo, indice) => (
                      <li key={indice} className="flex gap-2">
                        <span className="font-data text-ink-faint">{String(indice + 1).padStart(2, "0")}</span>
                        <span>
                          {passo.descricao}: <span className="font-data text-ink">{passo.data}</span>
                        </span>
                      </li>
                    ))}
                  </ol>
                )}

                {prazo.tarefas.length > 0 && (
                  <div className="mt-4 border-t border-rule pt-4">
                    <p className="eyebrow mb-2">Tarefas</p>
                    <ul className="flex flex-col gap-1.5 text-sm">
                      {prazo.tarefas.map((tarefa) => (
                        <li key={tarefa.id} className={tarefa.status === "CONCLUIDA" ? "text-ink-faint line-through" : "text-ink"}>
                          {tarefa.descricao}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {prazo.status === "PENDENTE_CONFIRMACAO" && (
                  <div className="mt-5 border-t border-rule pt-5">
                    <BotaoConfirmarPrazo prazoId={prazo.id} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="eyebrow mb-3">Histórico de auditoria</h2>
        {historico.length === 0 ? (
          <p className="paper-card rounded-sm px-5 py-6 text-center text-sm text-ink-faint">Nenhum evento registrado ainda.</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {historico.map((entrada) => (
              <li key={entrada.id} className="paper-card rounded-sm p-4 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium text-ink">
                    {entrada.acao} <span className="font-normal text-ink-faint">— {entrada.entidade}</span>
                  </span>
                  <span className="font-data text-xs text-ink-faint">{formatarDataHora(entrada.criadoEm)}</span>
                </div>
                <p className="mt-1 text-xs text-ink-soft">por {entrada.usuarioNome}</p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
