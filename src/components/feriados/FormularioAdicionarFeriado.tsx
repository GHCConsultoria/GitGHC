"use client";

import { useState, useTransition } from "react";
import { adicionarFeriado } from "@/lib/feriados/acoes";
import { UFS_BRASIL } from "@/lib/br/ufs";

type TipoFeriado = "FERIADO" | "SUSPENSAO" | "RECESSO";

export function FormularioAdicionarFeriado({ ufPadrao }: { ufPadrao: string }) {
  const [uf, setUf] = useState(ufPadrao);
  const [tribunal, setTribunal] = useState("");
  const [data, setData] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState<TipoFeriado>("FERIADO");
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [pendente, iniciarTransicao] = useTransition();

  function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setErro(null);
    setSucesso(false);
    iniciarTransicao(async () => {
      const resultado = await adicionarFeriado({
        uf,
        tribunal: tribunal.length > 0 ? tribunal : undefined,
        data,
        descricao,
        tipo,
      });
      if (!resultado.sucesso) {
        setErro(resultado.erro);
        return;
      }
      setSucesso(true);
      setTribunal("");
      setData("");
      setDescricao("");
    });
  }

  return (
    <form onSubmit={enviar} className="paper-card grid grid-cols-1 gap-4 rounded-sm p-6 sm:grid-cols-2">
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

      <label className="text-sm">
        <span className="eyebrow mb-1.5 block">Tribunal (vazio = estadual, todos)</span>
        <input
          type="text"
          placeholder="TJSP, TRF3…"
          value={tribunal}
          onChange={(evento) => setTribunal(evento.target.value)}
          className="w-full rounded-sm border border-rule bg-paper px-3 py-2 text-sm outline-none focus:border-brass"
        />
      </label>

      <label className="text-sm">
        <span className="eyebrow mb-1.5 block">Data</span>
        <input
          type="date"
          required
          value={data}
          onChange={(evento) => setData(evento.target.value)}
          className="w-full rounded-sm border border-rule bg-paper px-3 py-2 text-sm outline-none focus:border-brass"
        />
      </label>

      <label className="text-sm">
        <span className="eyebrow mb-1.5 block">Tipo</span>
        <select
          value={tipo}
          onChange={(evento) => setTipo(evento.target.value as TipoFeriado)}
          className="w-full rounded-sm border border-rule bg-paper px-3 py-2 text-sm outline-none focus:border-brass"
        >
          <option value="FERIADO">Feriado</option>
          <option value="SUSPENSAO">Suspensão</option>
          <option value="RECESSO">Recesso</option>
        </select>
      </label>

      <label className="text-sm sm:col-span-2">
        <span className="eyebrow mb-1.5 block">Descrição</span>
        <input
          type="text"
          required
          placeholder="Aniversário da comarca, feriado municipal…"
          value={descricao}
          onChange={(evento) => setDescricao(evento.target.value)}
          className="w-full rounded-sm border border-rule bg-paper px-3 py-2 text-sm outline-none focus:border-brass"
        />
      </label>

      {erro && <p className="text-sm text-urgent sm:col-span-2">{erro}</p>}
      {sucesso && <p className="text-sm text-calm sm:col-span-2">Feriado adicionado.</p>}

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pendente}
          className="rounded-sm bg-ink px-4 py-2 text-sm font-medium text-paper-raised transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pendente ? "Salvando…" : "Adicionar"}
        </button>
      </div>
    </form>
  );
}
