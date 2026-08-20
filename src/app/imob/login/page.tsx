"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { cadastrarImobiliaria, type EstadoLoginImob, entrarUsuarioImob } from "./actions";

const ESTADO_INICIAL: EstadoLoginImob = {};

export default function LoginImob() {
  const [modo, setModo] = useState<"entrar" | "cadastrar">("entrar");
  const [estadoEntrar, acaoEntrar] = useFormState(entrarUsuarioImob, ESTADO_INICIAL);
  const [estadoCadastrar, acaoCadastrar] = useFormState(cadastrarImobiliaria, ESTADO_INICIAL);
  const estado = modo === "entrar" ? estadoEntrar : estadoCadastrar;

  return (
    <main className="grid min-h-screen bg-paper text-ink sm:grid-cols-2">
      <section className="hidden flex-col justify-between bg-ink p-12 text-paper sm:flex">
        <span className="eyebrow" style={{ color: "var(--color-paper)", opacity: 0.7 }}>
          Gestão imobiliária
        </span>
        <blockquote className="font-display text-3xl leading-snug">
          Imóveis, leads, contratos e comissões — num só painel.
        </blockquote>
        <p className="max-w-sm text-sm" style={{ color: "var(--color-paper)", opacity: 0.6 }}>
          Cada imobiliária com seus próprios dados, usuários e permissões. Multi-tenant de verdade.
        </p>
      </section>

      <section className="flex flex-col justify-center px-6 py-16 sm:px-16">
        <div className="mx-auto w-full max-w-sm">
          <h1 className="font-display text-3xl">{modo === "entrar" ? "Entrar" : "Criar imobiliária"}</h1>
          <p className="mt-2 text-sm text-ink-soft">
            {modo === "entrar"
              ? "Acesse o painel da sua imobiliária."
              : "Cadastre sua imobiliária e o primeiro administrador."}
          </p>

          <div className="mt-6 flex gap-1 rounded-sm border border-rule p-1 text-sm">
            <BotaoAba ativo={modo === "entrar"} onClick={() => setModo("entrar")} rotulo="Entrar" />
            <BotaoAba ativo={modo === "cadastrar"} onClick={() => setModo("cadastrar")} rotulo="Criar conta" />
          </div>

          {modo === "entrar" ? (
            <form action={acaoEntrar} className="mt-6 flex flex-col gap-4">
              <Campo rotulo="E-mail" name="email" type="email" autoComplete="email" required />
              <Campo
                rotulo="Senha"
                name="senha"
                type="password"
                autoComplete="current-password"
                required
                minLength={6}
              />
              {estado.erro && <p className="text-sm text-urgent">{estado.erro}</p>}
              <Botao rotulo="Entrar" rotuloCarregando="Entrando…" />
            </form>
          ) : (
            <form action={acaoCadastrar} className="mt-6 flex flex-col gap-4">
              <Campo rotulo="Nome da imobiliária" name="nomeImobiliaria" type="text" required />
              <Campo rotulo="Seu nome" name="nomeAdmin" type="text" autoComplete="name" required />
              <Campo rotulo="E-mail" name="email" type="email" autoComplete="email" required />
              <Campo rotulo="Senha" name="senha" type="password" autoComplete="new-password" required minLength={6} />
              {estado.erro && <p className="text-sm text-urgent">{estado.erro}</p>}
              <Botao rotulo="Criar imobiliária" rotuloCarregando="Criando…" />
            </form>
          )}
        </div>
      </section>
    </main>
  );
}

function BotaoAba({ ativo, onClick, rotulo }: { ativo: boolean; onClick: () => void; rotulo: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-sm px-3 py-1.5 transition-colors ${ativo ? "bg-brass text-brass-on" : "text-ink-soft"}`}
    >
      {rotulo}
    </button>
  );
}

function Campo({
  rotulo,
  name,
  type,
  required,
  minLength,
  autoComplete,
}: {
  rotulo: string;
  name: string;
  type: string;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
}) {
  return (
    <label className="text-sm">
      <span className="eyebrow mb-1.5 block">{rotulo}</span>
      <input
        type={type}
        name={name}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        className="w-full rounded-sm border border-rule bg-paper-raised px-3 py-2.5 text-sm outline-none transition-colors focus:border-brass"
      />
    </label>
  );
}

function Botao({ rotulo, rotuloCarregando }: { rotulo: string; rotuloCarregando: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 rounded-sm bg-brass px-4 py-2.5 text-sm font-medium text-brass-on shadow-sm transition-colors hover:bg-brass-deep disabled:opacity-50"
    >
      {pending ? rotuloCarregando : rotulo}
    </button>
  );
}
