"use client";

import { useState, useTransition } from "react";
import { criarUsuario, editarUsuario } from "@/lib/imob/acoes";

interface UsuarioView {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  status: "ATIVO" | "INATIVO";
  papelId: string;
  papelNome: string;
  ultimoAcessoEm: string | null;
}
interface PapelOpcao {
  id: string;
  nome: string;
}

interface Props {
  podeCriar: boolean;
  podeEditar: boolean;
  usuarioAtualId: string;
  usuarios: UsuarioView[];
  papeis: PapelOpcao[];
}

type Formulario = { tipo: "novo" } | { tipo: "editar"; usuario: UsuarioView } | null;

const INPUT = "w-full rounded-sm border border-rule bg-paper-raised px-3 py-2 text-sm outline-none focus:border-brass";
const ROTULO = "eyebrow mb-1 block";

export function UsuariosClient({ podeCriar, podeEditar, usuarioAtualId, usuarios, papeis }: Props) {
  const [form, setForm] = useState<Formulario>(null);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="eyebrow">Equipe</p>
          <h1 className="font-display text-3xl">Usuários</h1>
        </div>
        {podeCriar && (
          <button
            type="button"
            onClick={() => setForm({ tipo: "novo" })}
            className="rounded-sm bg-brass px-4 py-2 text-sm font-medium text-brass-on hover:bg-brass-deep"
          >
            + Novo usuário
          </button>
        )}
      </header>

      {usuarios.length === 0 ? (
        <EstadoVazio podeCriar={podeCriar} onCriar={() => setForm({ tipo: "novo" })} />
      ) : (
        <div className="paper-card overflow-x-auto rounded-md">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-rule text-left text-ink-soft">
                <Th>Nome</Th>
                <Th>E-mail</Th>
                <Th>Papel</Th>
                <Th>Status</Th>
                <Th>Último acesso</Th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} className="border-b border-rule/60 last:border-0">
                  <td className="px-4 py-3 font-medium">{u.nome}</td>
                  <td className="px-4 py-3 text-ink-soft">{u.email}</td>
                  <td className="px-4 py-3">{u.papelNome}</td>
                  <td className="px-4 py-3">
                    <Selo ativo={u.status === "ATIVO"} />
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {u.ultimoAcessoEm ? new Date(u.ultimoAcessoEm).toLocaleDateString("pt-BR") : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {podeEditar && (
                      <button
                        type="button"
                        onClick={() => setForm({ tipo: "editar", usuario: u })}
                        className="text-ink-soft underline-offset-2 hover:text-ink hover:underline"
                      >
                        Editar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {form && (
        <ModalUsuario form={form} papeis={papeis} usuarioAtualId={usuarioAtualId} onFechar={() => setForm(null)} />
      )}
    </div>
  );
}

function ModalUsuario({
  form,
  papeis,
  usuarioAtualId,
  onFechar,
}: {
  form: Exclude<Formulario, null>;
  papeis: PapelOpcao[];
  usuarioAtualId: string;
  onFechar: () => void;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const editando = form.tipo === "editar";
  const u = editando ? form.usuario : null;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = editando ? await editarUsuario(fd) : await criarUsuario(fd);
      if (r.sucesso) onFechar();
      else setErro(r.erro);
    });
  }

  return (
    <Modal titulo={editando ? "Editar usuário" : "Novo usuário"} onFechar={onFechar}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {editando && <input type="hidden" name="usuarioId" value={u?.id} />}
        <label className="text-sm">
          <span className={ROTULO}>Nome</span>
          <input name="nome" required defaultValue={u?.nome} className={INPUT} />
        </label>
        {!editando && (
          <>
            <label className="text-sm">
              <span className={ROTULO}>E-mail</span>
              <input name="email" type="email" required className={INPUT} />
            </label>
            <label className="text-sm">
              <span className={ROTULO}>Senha inicial</span>
              <input name="senha" type="password" required minLength={6} className={INPUT} />
            </label>
          </>
        )}
        <label className="text-sm">
          <span className={ROTULO}>Telefone (opcional)</span>
          <input name="telefone" defaultValue={u?.telefone ?? ""} className={INPUT} />
        </label>
        <label className="text-sm">
          <span className={ROTULO}>Papel</span>
          <select name="papelId" required defaultValue={u?.papelId ?? ""} className={INPUT}>
            <option value="" disabled>
              Selecione…
            </option>
            {papeis.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </label>
        {editando && (
          <label className="text-sm">
            <span className={ROTULO}>Status</span>
            <select name="status" defaultValue={u?.status} className={INPUT} disabled={u?.id === usuarioAtualId}>
              <option value="ATIVO">Ativo</option>
              <option value="INATIVO">Inativo</option>
            </select>
            {u?.id === usuarioAtualId && (
              <span className="mt-1 block text-xs text-ink-faint">Você não pode inativar o próprio usuário.</span>
            )}
          </label>
        )}

        {erro && <p className="text-sm text-urgent">{erro}</p>}

        <div className="mt-2 flex justify-end gap-2">
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
      </form>
    </Modal>
  );
}

function Modal({ titulo, onFechar, children }: { titulo: string; onFechar: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="Fechar" onClick={onFechar} className="absolute inset-0 bg-black/40" />
      <div className="paper-card relative z-10 w-full max-w-md rounded-md p-6">
        <h2 className="font-display mb-4 text-xl">{titulo}</h2>
        {children}
      </div>
    </div>
  );
}

function EstadoVazio({ podeCriar, onCriar }: { podeCriar: boolean; onCriar: () => void }) {
  return (
    <div className="paper-card flex flex-col items-center gap-3 rounded-md p-10 text-center">
      <p className="text-sm text-ink-soft">Você ainda não cadastrou usuários além de você.</p>
      {podeCriar && (
        <button
          type="button"
          onClick={onCriar}
          className="rounded-sm bg-brass px-4 py-2 text-sm font-medium text-brass-on hover:bg-brass-deep"
        >
          + Cadastrar usuário
        </button>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 font-medium">{children}</th>;
}

function Selo({ ativo }: { ativo: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs ${
        ativo ? "bg-brass/15 text-brass-deep" : "bg-urgent-bg text-urgent"
      }`}
    >
      {ativo ? "Ativo" : "Inativo"}
    </span>
  );
}
