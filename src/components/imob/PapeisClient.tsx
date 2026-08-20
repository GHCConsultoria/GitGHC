"use client";

import { useMemo, useState, useTransition } from "react";
import { criarPapel, editarPapel } from "@/lib/imob/acoes";
import { CATALOGO_PERMISSOES, GRUPOS_PERMISSAO, PERMISSAO_TOTAL } from "@/lib/imob/rbac";

interface PapelView {
  id: string;
  nome: string;
  descricao: string | null;
  sistema: boolean;
  permissoes: string[];
  totalUsuarios: number;
}

interface Props {
  podeCriar: boolean;
  podeEditar: boolean;
  papeis: PapelView[];
}

type Formulario = { tipo: "novo" } | { tipo: "editar"; papel: PapelView } | null;

const INPUT = "w-full rounded-sm border border-rule bg-paper-raised px-3 py-2 text-sm outline-none focus:border-brass";

export function PapeisClient({ podeCriar, podeEditar, papeis }: Props) {
  const [form, setForm] = useState<Formulario>(null);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="eyebrow">Controle de acesso</p>
          <h1 className="font-display text-3xl">Papéis e permissões</h1>
        </div>
        {podeCriar && (
          <button
            type="button"
            onClick={() => setForm({ tipo: "novo" })}
            className="rounded-sm bg-brass px-4 py-2 text-sm font-medium text-brass-on hover:bg-brass-deep"
          >
            + Novo papel
          </button>
        )}
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {papeis.map((p) => (
          <div key={p.id} className="paper-card rounded-md p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-display text-lg">{p.nome}</h2>
                {p.descricao && <p className="mt-1 text-sm text-ink-soft">{p.descricao}</p>}
              </div>
              {p.sistema && <span className="eyebrow rounded-sm bg-paper px-2 py-1">Padrão</span>}
            </div>
            <p className="mt-3 text-xs text-ink-faint">
              {p.permissoes.includes(PERMISSAO_TOTAL) ? "Acesso total" : `${p.permissoes.length} permissões`} ·{" "}
              {p.totalUsuarios} usuário(s)
            </p>
            {podeEditar && !p.sistema && (
              <button
                type="button"
                onClick={() => setForm({ tipo: "editar", papel: p })}
                className="mt-3 text-sm text-ink-soft underline-offset-2 hover:text-ink hover:underline"
              >
                Editar
              </button>
            )}
          </div>
        ))}
      </div>

      {form && <ModalPapel form={form} onFechar={() => setForm(null)} />}
    </div>
  );
}

function ModalPapel({ form, onFechar }: { form: Exclude<Formulario, null>; onFechar: () => void }) {
  const editando = form.tipo === "editar";
  const papel = editando ? form.papel : null;
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set(papel?.permissoes ?? []));

  const porGrupo = useMemo(() => {
    return GRUPOS_PERMISSAO.map((grupo) => ({
      grupo,
      permissoes: CATALOGO_PERMISSOES.filter((p) => p.grupo === grupo),
    })).filter((g) => g.permissoes.length > 0);
  }, []);

  function alternar(chave: string) {
    setSelecionadas((prev) => {
      const proximo = new Set(prev);
      if (proximo.has(chave)) proximo.delete(chave);
      else proximo.add(chave);
      return proximo;
    });
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    const fd = new FormData(e.currentTarget);
    for (const chave of Array.from(selecionadas)) {
      fd.append("permissoes", chave);
    }
    start(async () => {
      const r = editando ? await editarPapel(fd) : await criarPapel(fd);
      if (r.sucesso) onFechar();
      else setErro(r.erro);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="Fechar" onClick={onFechar} className="absolute inset-0 bg-black/40" />
      <div className="paper-card relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col rounded-md">
        <h2 className="font-display border-b border-rule px-6 py-4 text-xl">
          {editando ? "Editar papel" : "Novo papel"}
        </h2>
        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          {editando && <input type="hidden" name="papelId" value={papel?.id} />}
          <div className="flex flex-col gap-4 overflow-y-auto px-6 py-4">
            <label className="text-sm">
              <span className="eyebrow mb-1 block">Nome</span>
              <input name="nome" required defaultValue={papel?.nome} className={INPUT} />
            </label>
            <label className="text-sm">
              <span className="eyebrow mb-1 block">Descrição (opcional)</span>
              <input name="descricao" defaultValue={papel?.descricao ?? ""} className={INPUT} />
            </label>

            <div>
              <p className="eyebrow mb-2">Permissões</p>
              <div className="flex flex-col gap-4">
                {porGrupo.map(({ grupo, permissoes }) => (
                  <fieldset key={grupo} className="rounded-sm border border-rule p-3">
                    <legend className="px-1 text-xs font-medium text-ink-soft">{grupo}</legend>
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      {permissoes.map((perm) => (
                        <label key={perm.chave} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={selecionadas.has(perm.chave)}
                            onChange={() => alternar(perm.chave)}
                          />
                          <span>{perm.descricao}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-rule px-6 py-4">
            {erro ? (
              <p className="text-sm text-urgent">{erro}</p>
            ) : (
              <span className="text-xs text-ink-faint">{selecionadas.size} selecionada(s)</span>
            )}
            <div className="flex gap-2">
              <button type="button" onClick={onFechar} className="rounded-sm border border-rule px-4 py-2 text-sm">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={pending}
                className="rounded-sm bg-brass px-4 py-2 text-sm font-medium text-brass-on hover:bg-brass-deep disabled:opacity-50"
              >
                {pending ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
