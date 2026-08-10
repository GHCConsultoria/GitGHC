"use client";

import { useState, useTransition } from "react";
import type { ModeloPeticao } from "@prisma/client";
import { criarModelo, editarModelo, excluirModelo } from "@/lib/modelos/acoes";

export function PainelModelos({
  modelos,
  tiposAtoPrazo,
}: {
  modelos: Array<ModeloPeticao & { criadoPor: { nome: string } }>;
  tiposAtoPrazo: string[];
}) {
  const [criando, setCriando] = useState(false);

  return (
    <div className="flex flex-col gap-8">
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="eyebrow">Seus modelos</h2>
          {!criando && (
            <button
              type="button"
              onClick={() => setCriando(true)}
              className="rounded-sm bg-brass px-3 py-1.5 text-xs font-medium text-brass-on shadow-sm transition-colors hover:bg-brass-deep"
            >
              Novo modelo
            </button>
          )}
        </div>

        {criando && (
          <div className="mb-5">
            <FormularioModelo
              tiposAtoPrazo={tiposAtoPrazo}
              onCancelar={() => setCriando(false)}
              onSalvar={async (dados) => {
                const resultado = await criarModelo(dados);
                if (resultado.sucesso) setCriando(false);
                return resultado;
              }}
            />
          </div>
        )}

        {modelos.length === 0 && !criando && (
          <p className="paper-card rounded-sm px-5 py-8 text-center text-sm text-ink-faint">
            Nenhum modelo cadastrado ainda.
          </p>
        )}

        <ul className="flex flex-col gap-3">
          {modelos.map((modelo) => (
            <li key={modelo.id}>
              <CartaoModelo modelo={modelo} tiposAtoPrazo={tiposAtoPrazo} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function CartaoModelo({
  modelo,
  tiposAtoPrazo,
}: {
  modelo: ModeloPeticao & { criadoPor: { nome: string } };
  tiposAtoPrazo: string[];
}) {
  const [editando, setEditando] = useState(false);
  const [excluido, setExcluido] = useState(false);
  const [pendente, iniciarTransicao] = useTransition();

  if (excluido) return null;

  if (editando) {
    return (
      <FormularioModelo
        tiposAtoPrazo={tiposAtoPrazo}
        valoresIniciais={{ titulo: modelo.titulo, tipoAto: modelo.tipoAto ?? "", conteudo: modelo.conteudo }}
        onCancelar={() => setEditando(false)}
        onSalvar={async (dados) => {
          const resultado = await editarModelo({ modeloId: modelo.id, ...dados });
          if (resultado.sucesso) setEditando(false);
          return resultado;
        }}
      />
    );
  }

  return (
    <article className="paper-card rounded-sm p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-ink">{modelo.titulo}</p>
          <p className="mt-0.5 text-xs text-ink-faint">
            {modelo.tipoAto ?? "Genérico (qualquer tipo de ato)"} · criado por {modelo.criadoPor.nome}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="text-xs font-medium text-ink-soft transition-colors hover:text-brass"
          >
            Editar
          </button>
          <button
            type="button"
            disabled={pendente}
            onClick={() => {
              if (!confirm(`Excluir o modelo "${modelo.titulo}"?`)) return;
              iniciarTransicao(async () => {
                const resultado = await excluirModelo({ modeloId: modelo.id });
                if (resultado.sucesso) setExcluido(true);
              });
            }}
            className="text-xs font-medium text-urgent transition-colors hover:opacity-80 disabled:opacity-50"
          >
            Excluir
          </button>
        </div>
      </div>
      <pre className="mt-3 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-sm border border-rule bg-paper p-3 font-data text-xs text-ink-soft">
        {modelo.conteudo}
      </pre>
    </article>
  );
}

interface DadosFormularioModelo {
  titulo: string;
  tipoAto: string;
  conteudo: string;
}

function FormularioModelo({
  tiposAtoPrazo,
  valoresIniciais,
  onCancelar,
  onSalvar,
}: {
  tiposAtoPrazo: string[];
  valoresIniciais?: DadosFormularioModelo;
  onCancelar: () => void;
  onSalvar: (dados: DadosFormularioModelo) => Promise<{ sucesso: boolean; erro?: string }>;
}) {
  const [titulo, setTitulo] = useState(valoresIniciais?.titulo ?? "");
  const [tipoAto, setTipoAto] = useState(valoresIniciais?.tipoAto ?? "");
  const [conteudo, setConteudo] = useState(valoresIniciais?.conteudo ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciarTransicao] = useTransition();

  return (
    <form
      className="paper-card flex flex-col gap-3 rounded-sm p-4"
      onSubmit={(evento) => {
        evento.preventDefault();
        setErro(null);
        iniciarTransicao(async () => {
          const resultado = await onSalvar({ titulo, tipoAto, conteudo });
          if (!resultado.sucesso) setErro(resultado.erro ?? "erro ao salvar");
        });
      }}
    >
      <label className="text-sm">
        <span className="eyebrow mb-1.5 block">Título</span>
        <input
          type="text"
          value={titulo}
          onChange={(evento) => setTitulo(evento.target.value)}
          required
          className="w-full rounded-sm border border-rule bg-paper-raised px-3 py-1.5 text-sm outline-none focus:border-brass"
        />
      </label>
      <label className="text-sm">
        <span className="eyebrow mb-1.5 block">Tipo de ato (opcional; em branco vale para qualquer um)</span>
        <select
          value={tipoAto}
          onChange={(evento) => setTipoAto(evento.target.value)}
          className="w-full rounded-sm border border-rule bg-paper-raised px-3 py-1.5 text-sm outline-none focus:border-brass"
        >
          <option value="">Genérico</option>
          {tiposAtoPrazo.map((tipo) => (
            <option key={tipo} value={tipo}>
              {tipo}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        <span className="eyebrow mb-1.5 block">Conteúdo</span>
        <textarea
          value={conteudo}
          onChange={(evento) => setConteudo(evento.target.value)}
          required
          rows={12}
          className="w-full rounded-sm border border-rule bg-paper-raised p-3 font-data text-xs leading-relaxed outline-none focus:border-brass"
        />
      </label>
      {erro && <p className="text-sm text-urgent">{erro}</p>}
      <div className="flex gap-2.5">
        <button
          type="submit"
          disabled={pendente}
          className="rounded-sm bg-brass px-4 py-2 text-sm font-medium text-brass-on shadow-sm transition-colors hover:bg-brass-deep disabled:opacity-50"
        >
          {pendente ? "Salvando…" : "Salvar"}
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
