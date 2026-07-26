"use client";

import { useState, useTransition } from "react";
import { z } from "zod";
import type { ItemFilaPrazo, NivelUrgencia } from "@/lib/prazos/fila";
import { confirmarPrazo, descartarPrazo, editarDataFatalPrazo } from "@/lib/prazos/acoes";

const passoSchema = z.object({ descricao: z.string(), data: z.string() });
const passosSchema = z.array(passoSchema);

function extrairPassos(detalhesCalculo: unknown): Array<z.infer<typeof passoSchema>> {
  const parsed = passosSchema.safeParse(detalhesCalculo);
  return parsed.success ? parsed.data : [];
}

const CORES_URGENCIA: Record<NivelUrgencia, string> = {
  VERMELHO: "border-red-500 bg-red-50 dark:bg-red-950/40",
  AMARELO: "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30",
  VERDE: "border-green-600 bg-green-50 dark:bg-green-950/30",
};

const ROTULO_URGENCIA: Record<NivelUrgencia, string> = {
  VERMELHO: "Urgente",
  AMARELO: "Atenção",
  VERDE: "Tranquilo",
};

function formatarData(data: Date | string): string {
  const instante = typeof data === "string" ? new Date(data) : data;
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short" }).format(instante);
}

export function PainelPrazos({ itens }: { itens: ItemFilaPrazo[] }) {
  if (itens.length === 0) {
    return <p className="text-sm text-black/50 dark:text-white/50">Nenhum prazo aguardando confirmação.</p>;
  }

  return (
    <ul className="flex flex-col gap-4">
      {itens.map((item) => (
        <li key={item.prazo.id}>
          <CartaoPrazo item={item} />
        </li>
      ))}
    </ul>
  );
}

function CartaoPrazo({ item }: { item: ItemFilaPrazo }) {
  const { prazo, urgencia, diasUteisRestantes } = item;
  const [mostrarPassos, setMostrarPassos] = useState(false);
  const [modoEdicao, setModoEdicao] = useState<"nenhum" | "editar" | "descartar">("nenhum");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciarTransicao] = useTransition();

  const passos = extrairPassos(prazo.detalhesCalculo);

  function confirmar() {
    setErro(null);
    iniciarTransicao(async () => {
      const resultado = await confirmarPrazo({ prazoId: prazo.id });
      if (!resultado.sucesso) setErro(resultado.erro);
    });
  }

  return (
    <div className={`rounded-lg border-l-4 p-4 shadow-sm ${CORES_URGENCIA[urgencia]}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">
            {item.prazo.processo.cliente} — {item.prazo.processo.varaOrgao}
          </p>
          <p className="text-sm text-black/60 dark:text-white/60">
            Processo {item.prazo.processo.numeroCnj} · {item.prazo.processo.tribunal}/{item.prazo.processo.uf}
          </p>
        </div>
        <span className="whitespace-nowrap rounded-full border border-current px-2 py-0.5 text-xs font-semibold">
          {ROTULO_URGENCIA[urgencia]} · {diasUteisRestantes}d úteis
        </span>
      </div>

      <div className="mt-3 rounded bg-black/[.03] p-2 text-sm dark:bg-white/[.06]">
        <p className="font-mono text-xs text-black/60 dark:text-white/60">Trecho da publicação:</p>
        <p className="line-clamp-3">{item.prazo.publicacao.conteudo}</p>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-black/50 dark:text-white/50">Tipo de ato</dt>
          <dd>{prazo.tipoAto}</dd>
        </div>
        <div>
          <dt className="text-black/50 dark:text-white/50">Disponibilização</dt>
          <dd>{formatarData(item.prazo.publicacao.dataDisponibilizacao)}</dd>
        </div>
        <div>
          <dt className="text-black/50 dark:text-white/50">Prazo</dt>
          <dd>
            {prazo.diasPrazo} dias {prazo.contagemDiasUteis ? "úteis" : "corridos"}
          </dd>
        </div>
        <div>
          <dt className="text-black/50 dark:text-white/50">Data fatal</dt>
          <dd className="font-semibold">{formatarData(prazo.dataFatal)}</dd>
        </div>
      </dl>

      {passos.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            className="text-xs font-medium underline underline-offset-2"
            onClick={() => setMostrarPassos((valor) => !valor)}
          >
            {mostrarPassos ? "Ocultar" : "Como foi calculada"}
          </button>
          {mostrarPassos && (
            <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-xs text-black/70 dark:text-white/70">
              {passos.map((passo, indice) => (
                <li key={indice}>
                  {passo.descricao}: <span className="font-mono">{passo.data}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}

      {modoEdicao === "nenhum" && (
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={pendente}
            onClick={confirmar}
            className="rounded bg-green-700 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            Confirmar
          </button>
          <button
            type="button"
            disabled={pendente}
            onClick={() => setModoEdicao("editar")}
            className="rounded border px-3 py-1.5 text-sm font-medium"
          >
            Editar data
          </button>
          <button
            type="button"
            disabled={pendente}
            onClick={() => setModoEdicao("descartar")}
            className="rounded border border-red-600 px-3 py-1.5 text-sm font-medium text-red-600"
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
    </div>
  );
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
      className="mt-4 flex flex-col gap-2 rounded border p-3"
      onSubmit={(evento) => {
        evento.preventDefault();
        onSalvar(novaData, justificativa);
      }}
    >
      <label className="text-sm">
        Nova data fatal
        <input
          type="date"
          value={novaData}
          onChange={(evento) => setNovaData(evento.target.value)}
          className="ml-2 rounded border px-2 py-1 text-sm"
          name={`nova-data-${prazoId}`}
          required
        />
      </label>
      <label className="text-sm">
        Justificativa (obrigatória)
        <textarea
          value={justificativa}
          onChange={(evento) => setJustificativa(evento.target.value)}
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          rows={2}
          minLength={5}
          required
        />
      </label>
      <div className="flex gap-2">
        <button type="submit" disabled={pendente} className="rounded bg-black px-3 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black">
          Salvar
        </button>
        <button type="button" onClick={onCancelar} className="rounded border px-3 py-1.5 text-sm">
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
      className="mt-4 flex flex-col gap-2 rounded border border-red-300 p-3"
      onSubmit={(evento) => {
        evento.preventDefault();
        onConfirmar(motivo);
      }}
    >
      <label className="text-sm">
        Motivo do descarte (obrigatório)
        <textarea
          value={motivo}
          onChange={(evento) => setMotivo(evento.target.value)}
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          rows={2}
          minLength={5}
          required
        />
      </label>
      <div className="flex gap-2">
        <button type="submit" disabled={pendente} className="rounded bg-red-700 px-3 py-1.5 text-sm text-white disabled:opacity-50">
          Confirmar descarte
        </button>
        <button type="button" onClick={onCancelar} className="rounded border px-3 py-1.5 text-sm">
          Cancelar
        </button>
      </div>
    </form>
  );
}
