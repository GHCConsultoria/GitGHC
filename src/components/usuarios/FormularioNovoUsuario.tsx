"use client";

import { useState, useTransition } from "react";
import { criarUsuario } from "@/lib/usuarios/acoes";

type Role = "ADVOGADO" | "ASSISTENTE";

interface Campos {
  nome: string;
  email: string;
  role: Role;
}

const ESTADO_INICIAL: Campos = { nome: "", email: "", role: "ADVOGADO" };

export function FormularioNovoUsuario() {
  const [campos, setCampos] = useState<Campos>(ESTADO_INICIAL);
  const [erro, setErro] = useState<string | null>(null);
  const [credenciaisCriadas, setCredenciaisCriadas] = useState<{ email: string; senha: string } | null>(null);
  const [pendente, iniciarTransicao] = useTransition();

  function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setErro(null);
    setCredenciaisCriadas(null);
    iniciarTransicao(async () => {
      const resultado = await criarUsuario(campos);
      if (!resultado.sucesso) {
        setErro(resultado.erro);
        return;
      }
      setCredenciaisCriadas({ email: resultado.email, senha: resultado.senhaTemporaria });
      setCampos(ESTADO_INICIAL);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={enviar} className="paper-card grid grid-cols-1 gap-4 rounded-sm p-6 sm:grid-cols-2">
        <label className="text-sm">
          <span className="eyebrow mb-1.5 block">Nome</span>
          <input
            type="text"
            required
            value={campos.nome}
            onChange={(evento) => setCampos((c) => ({ ...c, nome: evento.target.value }))}
            className="w-full rounded-sm border border-rule bg-paper px-3 py-2 text-sm outline-none focus:border-brass"
          />
        </label>

        <label className="text-sm">
          <span className="eyebrow mb-1.5 block">E-mail</span>
          <input
            type="email"
            required
            value={campos.email}
            onChange={(evento) => setCampos((c) => ({ ...c, email: evento.target.value }))}
            className="w-full rounded-sm border border-rule bg-paper px-3 py-2 text-sm outline-none focus:border-brass"
          />
        </label>

        <label className="text-sm">
          <span className="eyebrow mb-1.5 block">Papel</span>
          <select
            value={campos.role}
            onChange={(evento) => setCampos((c) => ({ ...c, role: evento.target.value as Role }))}
            className="w-full rounded-sm border border-rule bg-paper px-3 py-2 text-sm outline-none focus:border-brass"
          >
            <option value="ADVOGADO">Advogado</option>
            <option value="ASSISTENTE">Assistente</option>
          </select>
        </label>

        {erro && <p className="text-sm text-urgent sm:col-span-2">{erro}</p>}

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={pendente}
            className="rounded-sm bg-brass px-4 py-2 text-sm font-medium text-brass-on shadow-sm transition-colors hover:bg-brass-deep disabled:opacity-50"
          >
            {pendente ? "Criando…" : "Criar usuário"}
          </button>
        </div>
      </form>

      {credenciaisCriadas && (
        <div className="paper-card rounded-sm border-l-[3px] border-l-calm-line p-5">
          <p className="eyebrow mb-2 text-calm">Usuário criado: copie agora, não aparece de novo</p>
          <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-ink-faint">E-mail</dt>
              <dd className="font-data">{credenciaisCriadas.email}</dd>
            </div>
            <div>
              <dt className="text-ink-faint">Senha temporária</dt>
              <dd className="font-data">{credenciaisCriadas.senha}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-ink-soft">
            Repasse essas credenciais para a pessoa e peça para trocar a senha assim que entrar.
          </p>
        </div>
      )}
    </div>
  );
}
