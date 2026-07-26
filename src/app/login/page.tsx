"use client";

import { useFormState, useFormStatus } from "react-dom";
import { entrar, type EstadoLogin } from "./actions";

const ESTADO_INICIAL: EstadoLogin = {};

export default function Login() {
  const [estado, acao] = useFormState(entrar, ESTADO_INICIAL);

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">GitGHC</h1>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          Conferência de publicações e prazos — entre com sua conta.
        </p>
      </div>

      <form action={acao} className="flex flex-col gap-3">
        <label className="text-sm">
          E-mail
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          Senha
          <input
            type="password"
            name="senha"
            required
            autoComplete="current-password"
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
          />
        </label>

        {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}

        <BotaoEntrar />
      </form>

      <p className="text-xs text-black/50 dark:text-white/50">
        Não tem conta? Peça para o administrador do seu escritório te cadastrar.
      </p>
    </main>
  );
}

function BotaoEntrar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 rounded bg-black px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
    >
      {pending ? "Entrando…" : "Entrar"}
    </button>
  );
}
