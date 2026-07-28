"use client";

import { useState, useTransition } from "react";
import { criarProcesso } from "@/lib/processos/acoes";
import { UFS_BRASIL } from "@/lib/br/ufs";

type ParteRepresentada = "AUTOR" | "REU" | "TERCEIRO";

interface Campos {
  numeroCnj: string;
  cliente: string;
  varaOrgao: string;
  uf: string;
  tribunal: string;
  parteRepresentada: ParteRepresentada;
  prazoEmDobro: boolean;
}

const ESTADO_INICIAL: Campos = {
  numeroCnj: "",
  cliente: "",
  varaOrgao: "",
  uf: "SP",
  tribunal: "",
  parteRepresentada: "REU",
  prazoEmDobro: false,
};

export function FormularioNovoProcesso({
  valoresIniciais,
  publicacaoId,
  aoCadastrar,
}: {
  /** Pré-preenchimento (ex.: sugestão extraída do texto de uma publicação) — sempre editável antes de salvar. */
  valoresIniciais?: Partial<Campos>;
  /** Presente quando o cadastro nasce de uma publicação NAO_IDENTIFICADA: vincula ao ser criado. */
  publicacaoId?: string;
  aoCadastrar?: () => void;
} = {}) {
  const estadoInicial = { ...ESTADO_INICIAL, ...valoresIniciais };
  const [campos, setCampos] = useState<Campos>(estadoInicial);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [pendente, iniciarTransicao] = useTransition();

  function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setErro(null);
    setSucesso(false);
    iniciarTransicao(async () => {
      const resultado = await criarProcesso({ ...campos, publicacaoId });
      if (!resultado.sucesso) {
        setErro(resultado.erro);
        return;
      }
      setSucesso(true);
      setCampos(estadoInicial);
      aoCadastrar?.();
    });
  }

  return (
    <form onSubmit={enviar} className="paper-card grid grid-cols-1 gap-4 rounded-sm p-6 sm:grid-cols-2">
      <label className="text-sm sm:col-span-2">
        <span className="eyebrow mb-1.5 block">Número CNJ</span>
        <input
          type="text"
          required
          placeholder="1234567-89.2025.8.26.0100"
          value={campos.numeroCnj}
          onChange={(evento) => setCampos((c) => ({ ...c, numeroCnj: evento.target.value }))}
          className="w-full rounded-sm border border-rule bg-paper px-3 py-2 font-data text-sm outline-none focus:border-brass"
        />
      </label>

      <label className="text-sm">
        <span className="eyebrow mb-1.5 block">Cliente</span>
        <input
          type="text"
          required
          value={campos.cliente}
          onChange={(evento) => setCampos((c) => ({ ...c, cliente: evento.target.value }))}
          className="w-full rounded-sm border border-rule bg-paper px-3 py-2 text-sm outline-none focus:border-brass"
        />
      </label>

      <label className="text-sm">
        <span className="eyebrow mb-1.5 block">Vara/órgão</span>
        <input
          type="text"
          required
          value={campos.varaOrgao}
          onChange={(evento) => setCampos((c) => ({ ...c, varaOrgao: evento.target.value }))}
          className="w-full rounded-sm border border-rule bg-paper px-3 py-2 text-sm outline-none focus:border-brass"
        />
      </label>

      <label className="text-sm">
        <span className="eyebrow mb-1.5 block">UF</span>
        <select
          value={campos.uf}
          onChange={(evento) => setCampos((c) => ({ ...c, uf: evento.target.value }))}
          className="w-full rounded-sm border border-rule bg-paper px-3 py-2 text-sm outline-none focus:border-brass"
        >
          {UFS_BRASIL.map((uf) => (
            <option key={uf} value={uf}>
              {uf}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm">
        <span className="eyebrow mb-1.5 block">Tribunal</span>
        <input
          type="text"
          required
          placeholder="TJSP"
          value={campos.tribunal}
          onChange={(evento) => setCampos((c) => ({ ...c, tribunal: evento.target.value }))}
          className="w-full rounded-sm border border-rule bg-paper px-3 py-2 text-sm outline-none focus:border-brass"
        />
      </label>

      <label className="text-sm">
        <span className="eyebrow mb-1.5 block">Parte representada</span>
        <select
          value={campos.parteRepresentada}
          onChange={(evento) =>
            setCampos((c) => ({ ...c, parteRepresentada: evento.target.value as ParteRepresentada }))
          }
          className="w-full rounded-sm border border-rule bg-paper px-3 py-2 text-sm outline-none focus:border-brass"
        >
          <option value="AUTOR">Autor</option>
          <option value="REU">Réu</option>
          <option value="TERCEIRO">Terceiro</option>
        </select>
      </label>

      <label className="flex items-center gap-2.5 text-sm sm:col-span-2">
        <input
          type="checkbox"
          checked={campos.prazoEmDobro}
          onChange={(evento) => setCampos((c) => ({ ...c, prazoEmDobro: evento.target.checked }))}
          className="h-4 w-4 rounded-sm border-rule accent-brass"
        />
        Prazo em dobro (ex.: litisconsórcio com advogados distintos, defensoria pública)
      </label>

      {erro && <p className="text-sm text-urgent sm:col-span-2">{erro}</p>}
      {sucesso && (
        <p className="text-sm text-calm sm:col-span-2">
          {publicacaoId ? "Processo cadastrado e publicação vinculada." : "Processo cadastrado."}
        </p>
      )}

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pendente}
          className="rounded-sm bg-brass px-4 py-2 text-sm font-medium text-brass-on shadow-sm transition-colors hover:bg-brass-deep disabled:opacity-50"
        >
          {pendente ? "Salvando…" : "Cadastrar processo"}
        </button>
      </div>
    </form>
  );
}
