"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { entrar, type EstadoLogin } from "./actions";

const ESTADO_INICIAL: EstadoLogin = {};

export default function Login() {
  const [estado, acao] = useFormState(entrar, ESTADO_INICIAL);

  return (
    <main className="grid min-h-screen sm:grid-cols-2">
      <section
        className="hidden flex-col justify-between p-12 sm:flex"
        style={{ background: "var(--signature-ink)", color: "var(--signature-paper)" }}
      >
        <p className="eyebrow" style={{ color: "var(--signature-paper)", opacity: 0.5 }}>
          GitGHC
        </p>
        <blockquote className="font-display text-3xl leading-snug">
          &ldquo;O sistema propõe<span style={{ color: "var(--signature-brass)" }}>,</span> o advogado confirma.&rdquo;
        </blockquote>
        <p className="max-w-sm text-sm" style={{ color: "var(--signature-paper)", opacity: 0.6 }}>
          Nenhum prazo vira definitivo sem confirmação humana explícita — auditada, com autor e timestamp. É requisito
          jurídico, não detalhe de UX.
        </p>
      </section>

      <section className="flex flex-col justify-center px-6 py-16 sm:px-16">
        <div className="mx-auto w-full max-w-sm">
          <p className="eyebrow sm:hidden">GitGHC</p>
          <h1 className="font-display mt-1 text-3xl">Entrar</h1>
          <p className="mt-2 text-sm text-ink-soft">Conferência de publicações e prazos.</p>

          <form action={acao} className="mt-8 flex flex-col gap-4">
            <label className="text-sm">
              <span className="eyebrow mb-1.5 block">E-mail</span>
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                className="w-full rounded-sm border border-rule bg-paper-raised px-3 py-2.5 text-sm outline-none transition-colors focus:border-brass"
              />
            </label>
            <label className="text-sm">
              <span className="eyebrow mb-1.5 block">Senha</span>
              <input
                type="password"
                name="senha"
                required
                autoComplete="current-password"
                className="w-full rounded-sm border border-rule bg-paper-raised px-3 py-2.5 text-sm outline-none transition-colors focus:border-brass"
              />
            </label>

            {estado.erro && <p className="text-sm text-urgent">{estado.erro}</p>}

            <BotaoEntrar />
          </form>

          <p className="mt-8 text-xs text-ink-faint">
            Não tem conta?{" "}
            <Link href="/cadastro" className="underline decoration-dotted hover:text-brass">
              Cadastre seu escritório
            </Link>
            , ou peça para o administrador te adicionar a um já existente.
          </p>
        </div>
      </section>
    </main>
  );
}

function BotaoEntrar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 rounded-sm bg-brass px-4 py-2.5 text-sm font-medium text-brass-on shadow-sm transition-colors hover:bg-brass-deep disabled:opacity-50"
    >
      {pending ? "Entrando…" : "Entrar"}
    </button>
  );
}
