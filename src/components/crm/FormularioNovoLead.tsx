"use client";

import { useState, useTransition } from "react";
import { UFS_BRASIL } from "@/lib/br/ufs";
import { criarLead } from "@/lib/crm/acoes";
import { ROTULO_ORIGEM } from "@/lib/crm/funil";
import { parseMoedaParaCentavos } from "@/lib/crm/moeda";

type Origem = keyof typeof ROTULO_ORIGEM;

interface Campos {
  nomeEmpresa: string;
  nicho: string;
  contatoNome: string;
  contatoCargo: string;
  telefone: string;
  email: string;
  cidade: string;
  uf: string;
  endereco: string;
  origem: Origem;
  valorPotencial: string;
}

const ESTADO_INICIAL: Campos = {
  nomeEmpresa: "",
  nicho: "",
  contatoNome: "",
  contatoCargo: "",
  telefone: "",
  email: "",
  cidade: "",
  uf: "",
  endereco: "",
  origem: "PROSPECCAO_ATIVA",
  valorPotencial: "",
};

const CLASSE_INPUT = "w-full rounded-sm border border-rule bg-paper px-3 py-2 text-sm outline-none focus:border-brass";

export function FormularioNovoLead() {
  const [campos, setCampos] = useState<Campos>(ESTADO_INICIAL);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [pendente, iniciarTransicao] = useTransition();

  function definir<K extends keyof Campos>(chave: K, valor: Campos[K]) {
    setCampos((c) => ({ ...c, [chave]: valor }));
  }

  function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setErro(null);
    setSucesso(false);

    if (campos.valorPotencial.trim() && parseMoedaParaCentavos(campos.valorPotencial) === null) {
      setErro("valor potencial inválido — use algo como 1.500,00");
      return;
    }

    iniciarTransicao(async () => {
      const resultado = await criarLead({
        nomeEmpresa: campos.nomeEmpresa,
        nicho: campos.nicho,
        contatoNome: campos.contatoNome,
        contatoCargo: campos.contatoCargo,
        telefone: campos.telefone,
        email: campos.email,
        cidade: campos.cidade,
        uf: campos.uf || undefined,
        endereco: campos.endereco,
        origem: campos.origem,
        valorPotencialCentavos: parseMoedaParaCentavos(campos.valorPotencial),
      });
      if (!resultado.sucesso) {
        setErro(resultado.erro);
        return;
      }
      setSucesso(true);
      setCampos(ESTADO_INICIAL);
    });
  }

  return (
    <form onSubmit={enviar} className="paper-card grid grid-cols-1 gap-4 rounded-sm p-6 sm:grid-cols-2">
      <label className="text-sm">
        <span className="eyebrow mb-1.5 block">Empresa</span>
        <input
          type="text"
          required
          value={campos.nomeEmpresa}
          onChange={(e) => definir("nomeEmpresa", e.target.value)}
          className={CLASSE_INPUT}
        />
      </label>

      <label className="text-sm">
        <span className="eyebrow mb-1.5 block">Nicho / segmento</span>
        <input
          type="text"
          required
          placeholder="Padaria, oficina, clínica…"
          value={campos.nicho}
          onChange={(e) => definir("nicho", e.target.value)}
          className={CLASSE_INPUT}
        />
      </label>

      <label className="text-sm">
        <span className="eyebrow mb-1.5 block">Contato (nome)</span>
        <input
          type="text"
          value={campos.contatoNome}
          onChange={(e) => definir("contatoNome", e.target.value)}
          className={CLASSE_INPUT}
        />
      </label>

      <label className="text-sm">
        <span className="eyebrow mb-1.5 block">Cargo do contato</span>
        <input
          type="text"
          value={campos.contatoCargo}
          onChange={(e) => definir("contatoCargo", e.target.value)}
          className={CLASSE_INPUT}
        />
      </label>

      <label className="text-sm">
        <span className="eyebrow mb-1.5 block">Telefone / WhatsApp</span>
        <input
          type="text"
          value={campos.telefone}
          onChange={(e) => definir("telefone", e.target.value)}
          className={CLASSE_INPUT}
        />
      </label>

      <label className="text-sm">
        <span className="eyebrow mb-1.5 block">E-mail</span>
        <input
          type="email"
          value={campos.email}
          onChange={(e) => definir("email", e.target.value)}
          className={CLASSE_INPUT}
        />
      </label>

      <label className="text-sm">
        <span className="eyebrow mb-1.5 block">Cidade</span>
        <input
          type="text"
          value={campos.cidade}
          onChange={(e) => definir("cidade", e.target.value)}
          className={CLASSE_INPUT}
        />
      </label>

      <label className="text-sm">
        <span className="eyebrow mb-1.5 block">UF</span>
        <select value={campos.uf} onChange={(e) => definir("uf", e.target.value)} className={CLASSE_INPUT}>
          <option value="">—</option>
          {UFS_BRASIL.map((uf) => (
            <option key={uf} value={uf}>
              {uf}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm sm:col-span-2">
        <span className="eyebrow mb-1.5 block">Endereço</span>
        <input
          type="text"
          value={campos.endereco}
          onChange={(e) => definir("endereco", e.target.value)}
          className={CLASSE_INPUT}
        />
      </label>

      <label className="text-sm">
        <span className="eyebrow mb-1.5 block">Origem</span>
        <select
          value={campos.origem}
          onChange={(e) => definir("origem", e.target.value as Origem)}
          className={CLASSE_INPUT}
        >
          {(Object.keys(ROTULO_ORIGEM) as Origem[]).map((origem) => (
            <option key={origem} value={origem}>
              {ROTULO_ORIGEM[origem]}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm">
        <span className="eyebrow mb-1.5 block">Valor potencial (R$)</span>
        <input
          type="text"
          inputMode="decimal"
          placeholder="1.500,00"
          value={campos.valorPotencial}
          onChange={(e) => definir("valorPotencial", e.target.value)}
          className={`${CLASSE_INPUT} font-data`}
        />
      </label>

      {erro && <p className="text-sm text-urgent sm:col-span-2">{erro}</p>}
      {sucesso && <p className="text-sm text-calm sm:col-span-2">Lead cadastrado.</p>}

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pendente}
          className="rounded-sm bg-brass px-4 py-2 text-sm font-medium text-brass-on shadow-sm transition-colors hover:bg-brass-deep disabled:opacity-50"
        >
          {pendente ? "Salvando…" : "Cadastrar lead"}
        </button>
      </div>
    </form>
  );
}
