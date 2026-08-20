"use client";

import { useState, useTransition } from "react";
import {
  Campo,
  CampoSelect,
  CampoTextarea,
  CLASSE_BOTAO_NEUTRO,
  CLASSE_BOTAO_PRIMARIO,
  Mensagem,
  Modal,
} from "@/components/imob/primitivos";
import { criarLead, editarLead } from "@/lib/imob/acoes-crm";
import { centavosParaInput } from "@/lib/imob/formato";
import { ROTULO_ETAPA_LEAD, ROTULO_ORIGEM_LEAD } from "@/lib/imob/rotulos";

export interface LeadFormValores {
  id: string;
  nome: string;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  origem: string;
  etapa: string;
  valorPretendido: number | null;
  observacoes: string | null;
  proximaAcao: string | null;
  corretorId: string | null;
  imovelId: string | null;
  clienteId: string | null;
}

export interface OpcoesLead {
  corretores: Array<{ id: string; nome: string }>;
  imoveis: Array<{ id: string; nome: string }>;
  clientes: Array<{ id: string; nome: string }>;
}

const opc = (mapa: Record<string, string>) => Object.entries(mapa).map(([valor, rotulo]) => ({ valor, rotulo }));
const paraOpcoes = (lista: Array<{ id: string; nome: string }>) => lista.map((x) => ({ valor: x.id, rotulo: x.nome }));

export function LeadForm({
  item,
  opcoes,
  onFechar,
}: {
  item: LeadFormValores | null;
  opcoes: OpcoesLead;
  onFechar: () => void;
}) {
  const editando = item !== null;
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = editando ? await editarLead(fd) : await criarLead(fd);
      if (r.sucesso) onFechar();
      else setErro(r.erro);
    });
  }

  return (
    <Modal titulo={editando ? "Editar lead" : "Novo lead"} onFechar={onFechar} largura="max-w-xl">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {editando && <input type="hidden" name="id" value={item.id} />}
        <Campo rotulo="Nome" name="nome" defaultValue={item?.nome} required />
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Telefone" name="telefone" defaultValue={item?.telefone} />
          <Campo rotulo="WhatsApp" name="whatsapp" defaultValue={item?.whatsapp} />
          <Campo rotulo="E-mail" name="email" type="email" defaultValue={item?.email} />
          <Campo
            rotulo="Valor pretendido (R$)"
            name="valorPretendido"
            defaultValue={centavosParaInput(item?.valorPretendido)}
            placeholder="0,00"
          />
          <CampoSelect
            rotulo="Origem"
            name="origem"
            opcoes={opc(ROTULO_ORIGEM_LEAD)}
            defaultValue={item?.origem ?? "OUTROS"}
          />
          <CampoSelect
            rotulo="Etapa"
            name="etapa"
            opcoes={opc(ROTULO_ETAPA_LEAD)}
            defaultValue={item?.etapa ?? "NOVO"}
          />
          <CampoSelect
            rotulo="Corretor"
            name="corretorId"
            opcoes={paraOpcoes(opcoes.corretores)}
            incluirVazio="Sem corretor"
            defaultValue={item?.corretorId ?? ""}
          />
          <CampoSelect
            rotulo="Imóvel de interesse"
            name="imovelId"
            opcoes={paraOpcoes(opcoes.imoveis)}
            incluirVazio="Nenhum"
            defaultValue={item?.imovelId ?? ""}
          />
          <CampoSelect
            rotulo="Cliente vinculado"
            name="clienteId"
            opcoes={paraOpcoes(opcoes.clientes)}
            incluirVazio="Nenhum"
            defaultValue={item?.clienteId ?? ""}
          />
          <Campo rotulo="Próxima ação" name="proximaAcao" type="date" defaultValue={item?.proximaAcao ?? undefined} />
        </div>
        <CampoTextarea rotulo="Observações" name="observacoes" defaultValue={item?.observacoes} />
        <Mensagem erro={erro} />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onFechar} className={CLASSE_BOTAO_NEUTRO}>
            Cancelar
          </button>
          <button type="submit" disabled={pending} className={CLASSE_BOTAO_PRIMARIO}>
            {pending ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
