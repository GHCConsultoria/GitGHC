"use client";

import { useState, useTransition } from "react";
import { atualizarEscritorio } from "@/lib/escritorio/acoes";
import { UFS_BRASIL } from "@/lib/br/ufs";

export function FormularioEditarEscritorio({
  nomeInicial,
  oabInicial,
  ufInicial,
}: {
  nomeInicial: string;
  oabInicial: string;
  ufInicial: string;
}) {
  const [nome, setNome] = useState(nomeInicial);
  const [oab, setOab] = useState(oabInicial);
  const [uf, setUf] = useState(ufInicial);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [pendente, iniciarTransicao] = useTransition();

  function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setErro(null);
    setSucesso(false);
    iniciarTransicao(async () => {
      const resultado = await atualizarEscritorio({ nome, oab, uf });
      if (!resultado.sucesso) {
        setErro(resultado.erro);
        return;
      }
      setSucesso(true);
    });
  }

  return (
    <form onSubmit={enviar} className="paper-card grid grid-cols-1 gap-4 rounded-sm p-6 sm:grid-cols-2">
      <label className="text-sm sm:col-span-2">
        <span className="eyebrow mb-1.5 block">Nome do escritório</span>
        <input
          type="text"
          required
          value={nome}
          onChange={(evento) => setNome(evento.target.value)}
          className="w-full rounded-sm border border-rule bg-paper px-3 py-2 text-sm outline-none focus:border-brass"
        />
      </label>

      <label className="text-sm">
        <span className="eyebrow mb-1.5 block">OAB</span>
        <input
          type="text"
          required
          placeholder="123456/SP"
          value={oab}
          onChange={(evento) => setOab(evento.target.value)}
          className="w-full rounded-sm border border-rule bg-paper px-3 py-2 font-data text-sm outline-none focus:border-brass"
        />
        <span className="mt-1 block text-xs text-ink-faint">
          Só os números importam pra consulta ao DJEN — o resto é só exibição.
        </span>
      </label>

      <label className="text-sm">
        <span className="eyebrow mb-1.5 block">UF</span>
        <select
          value={uf}
          onChange={(evento) => setUf(evento.target.value)}
          className="w-full rounded-sm border border-rule bg-paper px-3 py-2 text-sm outline-none focus:border-brass"
        >
          {UFS_BRASIL.map((valor) => (
            <option key={valor} value={valor}>
              {valor}
            </option>
          ))}
        </select>
      </label>

      {erro && <p className="text-sm text-urgent sm:col-span-2">{erro}</p>}
      {sucesso && <p className="text-sm text-calm sm:col-span-2">Escritório atualizado.</p>}

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pendente}
          className="rounded-sm bg-brass px-4 py-2 text-sm font-medium text-brass-on shadow-sm transition-colors hover:bg-brass-deep disabled:opacity-50"
        >
          {pendente ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </form>
  );
}
