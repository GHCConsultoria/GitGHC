"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { cadastrarEscritorio, type EstadoCadastro } from "@/lib/cadastro/acoes";
import { UFS_BRASIL } from "@/lib/br/ufs";

const ESTADO_INICIAL: EstadoCadastro = {};

export default function Cadastro() {
  const [estado, acao] = useFormState(cadastrarEscritorio, ESTADO_INICIAL);

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
          &ldquo;Do Diário Oficial ao protocolo<span style={{ color: "var(--signature-brass)" }}>,</span> sem perder o
          controle de nenhum prazo.&rdquo;
        </blockquote>
        <p className="max-w-sm text-sm" style={{ color: "var(--signature-paper)", opacity: 0.6 }}>
          Cadastre seu escritório e comece a conferir publicações e prazos hoje mesmo.
        </p>
      </section>

      <section className="flex flex-col justify-center px-6 py-16 sm:px-16">
        <div className="mx-auto w-full max-w-sm">
          <p className="eyebrow sm:hidden">GitGHC</p>
          <h1 className="font-display mt-1 text-3xl">Cadastrar escritório</h1>
          <p className="mt-2 text-sm text-ink-soft">Você entra como o primeiro advogado do escritório.</p>

          <form action={acao} className="mt-8 flex flex-col gap-4">
            <label className="text-sm">
              <span className="eyebrow mb-1.5 block">Nome do escritório</span>
              <input
                type="text"
                name="nomeEscritorio"
                required
                className="w-full rounded-sm border border-rule bg-paper-raised px-3 py-2.5 text-sm outline-none transition-colors focus:border-brass"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">
                <span className="eyebrow mb-1.5 block">OAB</span>
                <input
                  type="text"
                  name="oab"
                  required
                  placeholder="123456"
                  className="w-full rounded-sm border border-rule bg-paper-raised px-3 py-2.5 text-sm outline-none transition-colors focus:border-brass"
                />
              </label>
              <label className="text-sm">
                <span className="eyebrow mb-1.5 block">UF</span>
                <select
                  name="uf"
                  required
                  defaultValue=""
                  className="w-full rounded-sm border border-rule bg-paper-raised px-3 py-2.5 text-sm outline-none transition-colors focus:border-brass"
                >
                  <option value="" disabled>
                    —
                  </option>
                  {UFS_BRASIL.map((uf) => (
                    <option key={uf} value={uf}>
                      {uf}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="text-sm">
              <span className="eyebrow mb-1.5 block">Seu nome</span>
              <input
                type="text"
                name="nome"
                required
                autoComplete="name"
                className="w-full rounded-sm border border-rule bg-paper-raised px-3 py-2.5 text-sm outline-none transition-colors focus:border-brass"
              />
            </label>
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
                minLength={6}
                autoComplete="new-password"
                className="w-full rounded-sm border border-rule bg-paper-raised px-3 py-2.5 text-sm outline-none transition-colors focus:border-brass"
              />
            </label>

            {estado.erro && <p className="text-sm text-urgent">{estado.erro}</p>}

            <BotaoCadastrar />
          </form>

          <p className="mt-8 text-xs text-ink-faint">
            Já tem conta?{" "}
            <Link href="/login" className="underline decoration-dotted hover:text-brass">
              Entrar
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

function BotaoCadastrar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 rounded-sm bg-brass px-4 py-2.5 text-sm font-medium text-brass-on shadow-sm transition-colors hover:bg-brass-deep disabled:opacity-50"
    >
      {pending ? "Criando…" : "Criar escritório"}
    </button>
  );
}
