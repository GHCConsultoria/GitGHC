"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { z } from "zod";
import type { ItemFilaPrazo, NivelUrgencia } from "@/lib/prazos/fila";
import type { ResultadoVerificacaoPrazo } from "@/lib/prazos/verificacao";
import { confirmarPrazo, descartarPrazo, editarDataFatalPrazo } from "@/lib/prazos/acoes";
import { atribuirResponsavelPrazo } from "@/lib/prazos/tarefas";
import { formatarDataCalendario } from "@/lib/formatacao";
import { PainelTarefas, type UsuarioSelecionavel } from "./PainelTarefas";
import { ResumoPublicacao } from "@/components/publicacoes/ResumoPublicacao";

const passoSchema = z.object({ descricao: z.string(), data: z.string() });
const passosSchema = z.array(passoSchema);

function extrairPassos(detalhesCalculo: unknown): Array<z.infer<typeof passoSchema>> {
  const parsed = passosSchema.safeParse(detalhesCalculo);
  return parsed.success ? parsed.data : [];
}

const ACENTO_URGENCIA: Record<NivelUrgencia, string> = {
  CRITICO: "border-l-urgent-line",
  VERMELHO: "border-l-urgent-line",
  AMARELO: "border-l-attention-line",
  VERDE: "border-l-calm-line",
};

const SELO_URGENCIA: Record<NivelUrgencia, string> = {
  CRITICO: "bg-urgent text-paper-raised border-urgent",
  VERMELHO: "bg-urgent-bg text-urgent border-urgent-line/40",
  AMARELO: "bg-attention-bg text-attention border-attention-line/40",
  VERDE: "bg-calm-bg text-calm border-calm-line/40",
};

const ROTULO_URGENCIA: Record<NivelUrgencia, string> = {
  CRITICO: "Crítico",
  VERMELHO: "Urgente",
  AMARELO: "Atenção",
  VERDE: "Tranquilo",
};


export function PainelPrazos({
  itens,
  usuarios,
  podeConfirmar,
  riscoPrazoIds,
}: {
  itens: ItemFilaPrazo[];
  usuarios: UsuarioSelecionavel[];
  podeConfirmar: boolean;
  riscoPrazoIds: string[];
}) {
  if (itens.length === 0) {
    return (
      <p className="paper-card rounded-sm px-5 py-8 text-center text-sm text-ink-faint">
        Nenhum prazo aguardando confirmação.
      </p>
    );
  }

  const riscoIds = new Set(riscoPrazoIds);

  return (
    <ul className="flex flex-col gap-5">
      {itens.map((item, indice) => (
        <li key={item.prazo.id} className="stagger-in" style={{ "--stagger-index": indice } as React.CSSProperties}>
          <CartaoPrazo item={item} usuarios={usuarios} podeConfirmar={podeConfirmar} emRisco={riscoIds.has(item.prazo.id)} />
        </li>
      ))}
    </ul>
  );
}

function CartaoPrazo({
  item,
  usuarios,
  podeConfirmar,
  emRisco,
}: {
  item: ItemFilaPrazo;
  usuarios: UsuarioSelecionavel[];
  podeConfirmar: boolean;
  emRisco: boolean;
}) {
  const { prazo, urgencia, diasUteisRestantes } = item;
  const [mostrarPassos, setMostrarPassos] = useState(false);
  const [modoEdicao, setModoEdicao] = useState<"nenhum" | "editar" | "descartar">("nenhum");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciarTransicao] = useTransition();

  const passos = extrairPassos(prazo.detalhesCalculo);
  const [responsavelId, setResponsavelId] = useState(prazo.responsavelId ?? "");
  const [pendenteResponsavel, iniciarTransicaoResponsavel] = useTransition();

  function alterarResponsavel(novoResponsavelId: string) {
    setResponsavelId(novoResponsavelId);
    iniciarTransicaoResponsavel(async () => {
      await atribuirResponsavelPrazo({ prazoId: prazo.id, responsavelId: novoResponsavelId || null });
    });
  }

  function confirmar() {
    setErro(null);
    iniciarTransicao(async () => {
      const resultado = await confirmarPrazo({ prazoId: prazo.id });
      if (!resultado.sucesso) setErro(resultado.erro);
    });
  }

  return (
    <article className={`paper-card rounded-sm border-l-[3px] p-5 sm:p-6 ${ACENTO_URGENCIA[urgencia]}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-xl leading-snug">{item.prazo.processo.cliente}</h3>
          <p className="mt-0.5 text-sm text-ink-soft">{item.prazo.processo.varaOrgao}</p>
          <p className="mt-1 font-data text-xs tracking-wide text-ink-faint">
            {item.prazo.processo.numeroCnj} · {item.prazo.processo.tribunal}/{item.prazo.processo.uf}
          </p>
          <Link
            href={`/publicacoes/${item.prazo.publicacaoId}`}
            className="mt-1.5 inline-block text-xs text-ink-faint underline decoration-dotted transition-colors hover:text-brass"
          >
            Ver central da publicação
          </Link>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="flex items-center gap-1.5">
            {emRisco && (
              <span
                title="Este prazo também está sinalizado no painel de Riscos"
                className="rounded-full border border-ink-faint/40 px-2 py-1 text-[0.65rem] leading-none text-ink-faint"
              >
                ⚫ risco
              </span>
            )}
            <span
              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium ${SELO_URGENCIA[urgencia]}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {ROTULO_URGENCIA[urgencia]} · {diasUteisRestantes}d úteis
            </span>
          </div>
          <select
            value={responsavelId}
            disabled={pendenteResponsavel}
            onChange={(evento) => alterarResponsavel(evento.target.value)}
            className="rounded-sm border border-rule bg-paper-raised px-2 py-1 text-xs text-ink-soft outline-none focus:border-brass disabled:opacity-50"
          >
            <option value="">Sem responsável</option>
            {usuarios.map((usuario) => (
              <option key={usuario.id} value={usuario.id}>
                {usuario.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      <blockquote className="mt-4 border-l-2 border-rule py-1 pl-4">
        <p className="eyebrow mb-1">Resumo da publicação</p>
        <ResumoPublicacao
          publicacaoId={item.prazo.publicacaoId}
          resumoInicial={item.prazo.publicacao.resumoIa}
          textoOriginal={item.prazo.publicacao.conteudo}
        />
      </blockquote>

      <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
        <div>
          <dt className="eyebrow mb-1">Tipo de ato</dt>
          <dd className="text-sm">{prazo.tipoAto}</dd>
        </div>
        <div>
          <dt className="eyebrow mb-1">Disponibilização</dt>
          <dd className="font-data text-sm">{formatarDataCalendario(item.prazo.publicacao.dataDisponibilizacao)}</dd>
        </div>
        <div>
          <dt className="eyebrow mb-1">Prazo</dt>
          <dd className="font-data text-sm">
            {prazo.diasPrazo} {prazo.contagemDiasUteis ? "dias úteis" : "dias corridos"}
          </dd>
        </div>
        <div>
          <dt className="eyebrow mb-1">Data fatal</dt>
          <dd className="font-display text-lg leading-none text-brass">{formatarDataCalendario(prazo.dataFatal)}</dd>
        </div>
      </dl>

      <ConferenciaAutomatica verificacao={item.verificacao} />

      {passos.length > 0 && (
        <div className="mt-4">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-soft transition-colors hover:text-brass"
            onClick={() => setMostrarPassos((valor) => !valor)}
          >
            <svg
              viewBox="0 0 10 10"
              className={`h-2.5 w-2.5 transition-transform duration-300 ${mostrarPassos ? "rotate-180" : ""}`}
              fill="none"
            >
              <path d="M1.5 3.5 5 7l3.5-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Como foi calculada
          </button>
          <div className={`expand ${mostrarPassos ? "is-open" : ""}`}>
            <div>
              <ol className="mt-3 space-y-1.5 border-t border-rule pt-3 text-xs text-ink-soft">
                {passos.map((passo, indice) => (
                  <li key={indice} className="flex gap-2">
                    <span className="font-data text-ink-faint">{String(indice + 1).padStart(2, "0")}</span>
                    <span>
                      {passo.descricao}: <span className="font-data text-ink">{passo.data}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}

      {erro && <p className="mt-3 text-sm text-urgent">{erro}</p>}

      {!podeConfirmar && (
        <p className="mt-5 border-t border-rule pt-5 text-xs text-ink-faint">
          Só advogados podem confirmar, editar ou descartar prazos. Peça pra alguém com esse papel.
        </p>
      )}

      {podeConfirmar && modoEdicao === "nenhum" && (
        <div className="mt-5 flex flex-wrap gap-2.5 border-t border-rule pt-5">
          <button
            type="button"
            disabled={pendente}
            onClick={confirmar}
            className="rounded-sm bg-brass px-4 py-2 text-sm font-medium text-brass-on shadow-sm transition-colors hover:bg-brass-deep disabled:opacity-50"
          >
            Confirmar
          </button>
          <button
            type="button"
            disabled={pendente}
            onClick={() => setModoEdicao("editar")}
            className="rounded-sm border border-rule px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-ink-faint disabled:opacity-50"
          >
            Editar data
          </button>
          <button
            type="button"
            disabled={pendente}
            onClick={() => setModoEdicao("descartar")}
            className="rounded-sm border border-urgent-line/40 px-4 py-2 text-sm font-medium text-urgent transition-colors hover:bg-urgent-bg disabled:opacity-50"
          >
            Descartar
          </button>
        </div>
      )}

      {modoEdicao === "editar" && (
        <FormularioEditarData
          prazoId={prazo.id}
          dataFatalAtual={prazo.dataFatal}
          pendente={pendente}
          onCancelar={() => setModoEdicao("nenhum")}
          onSalvar={(novaDataFatal, justificativa) => {
            setErro(null);
            iniciarTransicao(async () => {
              const resultado = await editarDataFatalPrazo({ prazoId: prazo.id, novaDataFatal, justificativa });
              if (!resultado.sucesso) setErro(resultado.erro);
              else setModoEdicao("nenhum");
            });
          }}
        />
      )}

      {modoEdicao === "descartar" && (
        <FormularioDescartar
          pendente={pendente}
          onCancelar={() => setModoEdicao("nenhum")}
          onConfirmar={(motivo) => {
            setErro(null);
            iniciarTransicao(async () => {
              const resultado = await descartarPrazo({ prazoId: prazo.id, motivo });
              if (!resultado.sucesso) setErro(resultado.erro);
              else setModoEdicao("nenhum");
            });
          }}
        />
      )}

      <PainelTarefas
        prazoId={prazo.id}
        tarefas={prazo.tarefas.map((tarefa) => ({
          id: tarefa.id,
          descricao: tarefa.descricao,
          status: tarefa.status,
          responsavelId: tarefa.responsavelId,
        }))}
        usuarios={usuarios}
      />
    </article>
  );
}

/**
 * "Dupla checagem" leve (ver src/lib/prazos/verificacao.ts): reexecuta o
 * motor de cálculo com os dados originais do prazo e mostra se o valor
 * salvo ainda bate. Sempre visível — ninguém deveria precisar clicar em
 * nada pra saber se a data que está prestes a confirmar foi conferida de
 * novo ou não.
 */
function ConferenciaAutomatica({ verificacao }: { verificacao: ResultadoVerificacaoPrazo }) {
  if (verificacao.status === "CONFERIDO") {
    return (
      <p className="mt-3 text-xs text-calm">✓ Recalculado e conferido, sem divergência em relação ao valor salvo.</p>
    );
  }
  if (verificacao.status === "DIVERGENTE") {
    return (
      <p className="mt-3 text-xs text-urgent">
        ⚠ Recálculo diverge do valor salvo: {verificacao.motivo}. Data recalculada:{" "}
        <span className="font-data">{formatarDataCalendario(verificacao.dataFatalRecalculada)}</span>. Revise antes
        de confirmar.
      </p>
    );
  }
  return <p className="mt-3 text-xs text-ink-faint">Conferência automática indisponível: {verificacao.motivo}.</p>;
}

function FormularioEditarData({
  prazoId,
  dataFatalAtual,
  pendente,
  onCancelar,
  onSalvar,
}: {
  prazoId: string;
  dataFatalAtual: Date;
  pendente: boolean;
  onCancelar: () => void;
  onSalvar: (novaDataFatal: string, justificativa: string) => void;
}) {
  const [novaData, setNovaData] = useState(() => new Date(dataFatalAtual).toISOString().slice(0, 10));
  const [justificativa, setJustificativa] = useState("");

  return (
    <form
      className="mt-5 flex flex-col gap-3 rounded-sm border border-rule bg-paper p-4"
      onSubmit={(evento) => {
        evento.preventDefault();
        onSalvar(novaData, justificativa);
      }}
    >
      <label className="text-sm">
        <span className="eyebrow mb-1.5 block">Nova data fatal</span>
        <input
          type="date"
          value={novaData}
          onChange={(evento) => setNovaData(evento.target.value)}
          className="rounded-sm border border-rule bg-paper-raised px-3 py-1.5 text-sm outline-none focus:border-brass"
          name={`nova-data-${prazoId}`}
          required
        />
      </label>
      <label className="text-sm">
        <span className="eyebrow mb-1.5 block">Justificativa (obrigatória)</span>
        <textarea
          value={justificativa}
          onChange={(evento) => setJustificativa(evento.target.value)}
          className="w-full rounded-sm border border-rule bg-paper-raised px-3 py-2 text-sm outline-none focus:border-brass"
          rows={2}
          minLength={5}
          required
        />
      </label>
      <div className="flex gap-2.5">
        <button
          type="submit"
          disabled={pendente}
          className="rounded-sm bg-ink px-4 py-2 text-sm font-medium text-paper-raised transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          Salvar
        </button>
        <button
          type="button"
          onClick={onCancelar}
          className="rounded-sm border border-rule px-4 py-2 text-sm text-ink-soft hover:text-ink"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

function FormularioDescartar({
  pendente,
  onCancelar,
  onConfirmar,
}: {
  pendente: boolean;
  onCancelar: () => void;
  onConfirmar: (motivo: string) => void;
}) {
  const [motivo, setMotivo] = useState("");

  return (
    <form
      className="mt-5 flex flex-col gap-3 rounded-sm border border-urgent-line/30 bg-urgent-bg/40 p-4"
      onSubmit={(evento) => {
        evento.preventDefault();
        onConfirmar(motivo);
      }}
    >
      <label className="text-sm">
        <span className="eyebrow mb-1.5 block">Motivo do descarte (obrigatório)</span>
        <textarea
          value={motivo}
          onChange={(evento) => setMotivo(evento.target.value)}
          className="w-full rounded-sm border border-rule bg-paper-raised px-3 py-2 text-sm outline-none focus:border-urgent"
          rows={2}
          minLength={5}
          required
        />
      </label>
      <div className="flex gap-2.5">
        <button
          type="submit"
          disabled={pendente}
          className="rounded-sm bg-urgent px-4 py-2 text-sm font-medium text-paper-raised transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          Confirmar descarte
        </button>
        <button
          type="button"
          onClick={onCancelar}
          className="rounded-sm border border-rule px-4 py-2 text-sm text-ink-soft hover:text-ink"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
