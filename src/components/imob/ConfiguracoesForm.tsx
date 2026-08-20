"use client";

import { useState, useTransition } from "react";
import { salvarConfiguracoes } from "@/lib/imob/acoes";

interface Valores {
  nome: string;
  cnpj: string;
  creci: string;
  email: string;
  telefone: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  corPrimaria: string;
}

const INPUT =
  "w-full rounded-sm border border-rule bg-paper-raised px-3 py-2 text-sm outline-none focus:border-brass disabled:opacity-60";

export function ConfiguracoesForm({ valores, somenteLeitura }: { valores: Valores; somenteLeitura: boolean }) {
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setOk(false);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = await salvarConfiguracoes(fd);
      if (r.sucesso) setOk(true);
      else setErro(r.erro);
    });
  }

  return (
    <form onSubmit={onSubmit} className="paper-card flex flex-col gap-5 rounded-md p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Nome" name="nome" defaultValue={valores.nome} required disabled={somenteLeitura} />
        <Campo rotulo="CNPJ" name="cnpj" defaultValue={valores.cnpj} disabled={somenteLeitura} />
        <Campo rotulo="CRECI" name="creci" defaultValue={valores.creci} disabled={somenteLeitura} />
        <Campo rotulo="E-mail" name="email" type="email" defaultValue={valores.email} disabled={somenteLeitura} />
        <Campo rotulo="Telefone" name="telefone" defaultValue={valores.telefone} disabled={somenteLeitura} />
        <label className="text-sm">
          <span className="eyebrow mb-1 block">Cor da marca</span>
          <input
            type="color"
            name="corPrimaria"
            defaultValue={valores.corPrimaria}
            disabled={somenteLeitura}
            className="h-10 w-full rounded-sm border border-rule bg-paper-raised disabled:opacity-60"
          />
        </label>
      </div>

      <div className="rule pt-4">
        <p className="eyebrow mb-3">Endereço</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="CEP" name="cep" defaultValue={valores.cep} disabled={somenteLeitura} />
          <Campo rotulo="Logradouro" name="logradouro" defaultValue={valores.logradouro} disabled={somenteLeitura} />
          <Campo rotulo="Número" name="numero" defaultValue={valores.numero} disabled={somenteLeitura} />
          <Campo rotulo="Complemento" name="complemento" defaultValue={valores.complemento} disabled={somenteLeitura} />
          <Campo rotulo="Bairro" name="bairro" defaultValue={valores.bairro} disabled={somenteLeitura} />
          <Campo rotulo="Cidade" name="cidade" defaultValue={valores.cidade} disabled={somenteLeitura} />
          <Campo rotulo="UF" name="estado" defaultValue={valores.estado} maxLength={2} disabled={somenteLeitura} />
        </div>
      </div>

      {!somenteLeitura && (
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-sm bg-brass px-4 py-2 text-sm font-medium text-brass-on hover:bg-brass-deep disabled:opacity-50"
          >
            {pending ? "Salvando…" : "Salvar alterações"}
          </button>
          {ok && <span className="text-sm text-brass-deep">Salvo.</span>}
          {erro && <span className="text-sm text-urgent">{erro}</span>}
        </div>
      )}
    </form>
  );
}

function Campo({
  rotulo,
  name,
  defaultValue,
  type = "text",
  required,
  disabled,
  maxLength,
}: {
  rotulo: string;
  name: string;
  defaultValue: string;
  type?: string;
  required?: boolean;
  disabled?: boolean;
  maxLength?: number;
}) {
  return (
    <label className="text-sm">
      <span className="eyebrow mb-1 block">{rotulo}</span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        required={required}
        disabled={disabled}
        maxLength={maxLength}
        className={INPUT}
      />
    </label>
  );
}
