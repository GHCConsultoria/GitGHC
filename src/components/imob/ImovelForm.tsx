"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  Campo,
  CampoSelect,
  CampoTextarea,
  CLASSE_BOTAO_NEUTRO,
  CLASSE_BOTAO_PRIMARIO,
  CLASSE_ROTULO,
  Mensagem,
} from "@/components/imob/primitivos";
import { criarImovel, editarImovel } from "@/lib/imob/acoes-cadastros";
import { centavosParaInput } from "@/lib/imob/formato";
import { ROTULO_FINALIDADE, ROTULO_STATUS_IMOVEL, ROTULO_TIPO_IMOVEL } from "@/lib/imob/rotulos";

export interface ImovelFormValores {
  id?: string;
  codigo: string;
  titulo: string;
  descricao: string | null;
  tipo: string;
  finalidade: string;
  status: string;
  precoVenda: number | null;
  precoAluguel: number | null;
  condominio: number | null;
  iptu: number | null;
  areaTotal: number | null;
  areaConstruida: number | null;
  quartos: number | null;
  suites: number | null;
  banheiros: number | null;
  vagas: number | null;
  andar: number | null;
  anoConstrucao: number | null;
  aceitaFinanciamento: boolean;
  aceitaPermuta: boolean;
  mobiliado: boolean;
  caracteristicas: string[];
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  tourVirtualUrl: string | null;
  proprietarioIds: string[];
}

interface Props {
  modo: "novo" | "editar";
  valores?: ImovelFormValores;
  proprietarios: Array<{ id: string; nome: string }>;
}

const opcoes = (mapa: Record<string, string>) => Object.entries(mapa).map(([valor, rotulo]) => ({ valor, rotulo }));

export function ImovelForm({ modo, valores, proprietarios }: Props) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const selecionados = new Set(valores?.proprietarioIds ?? []);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      if (modo === "novo") {
        const r = await criarImovel(fd);
        if (r.sucesso) router.push(`/imob/imoveis/${r.id}`);
        else setErro(r.erro);
      } else {
        const r = await editarImovel(fd);
        if (r.sucesso) router.push(`/imob/imoveis/${valores?.id}`);
        else setErro(r.erro);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      {modo === "editar" && <input type="hidden" name="id" value={valores?.id} />}

      <Secao titulo="Identificação">
        <Campo rotulo="Código interno" name="codigo" defaultValue={valores?.codigo} required />
        <Campo rotulo="Título" name="titulo" defaultValue={valores?.titulo} required />
        <CampoSelect
          rotulo="Tipo"
          name="tipo"
          opcoes={opcoes(ROTULO_TIPO_IMOVEL)}
          defaultValue={valores?.tipo}
          incluirVazio="Selecione…"
          required
        />
        <CampoSelect
          rotulo="Finalidade"
          name="finalidade"
          opcoes={opcoes(ROTULO_FINALIDADE)}
          defaultValue={valores?.finalidade}
          incluirVazio="Selecione…"
          required
        />
        <CampoSelect
          rotulo="Status"
          name="status"
          opcoes={opcoes(ROTULO_STATUS_IMOVEL)}
          defaultValue={valores?.status ?? "DISPONIVEL"}
        />
      </Secao>

      <CampoTextarea rotulo="Descrição" name="descricao" defaultValue={valores?.descricao} rows={4} />

      <Secao titulo="Valores (R$)">
        <Campo
          rotulo="Venda"
          name="precoVenda"
          defaultValue={centavosParaInput(valores?.precoVenda)}
          placeholder="0,00"
        />
        <Campo
          rotulo="Aluguel"
          name="precoAluguel"
          defaultValue={centavosParaInput(valores?.precoAluguel)}
          placeholder="0,00"
        />
        <Campo
          rotulo="Condomínio"
          name="condominio"
          defaultValue={centavosParaInput(valores?.condominio)}
          placeholder="0,00"
        />
        <Campo rotulo="IPTU" name="iptu" defaultValue={centavosParaInput(valores?.iptu)} placeholder="0,00" />
      </Secao>

      <Secao titulo="Características">
        <Campo rotulo="Área total (m²)" name="areaTotal" type="number" defaultValue={valores?.areaTotal} />
        <Campo
          rotulo="Área construída (m²)"
          name="areaConstruida"
          type="number"
          defaultValue={valores?.areaConstruida}
        />
        <Campo rotulo="Quartos" name="quartos" type="number" defaultValue={valores?.quartos} />
        <Campo rotulo="Suítes" name="suites" type="number" defaultValue={valores?.suites} />
        <Campo rotulo="Banheiros" name="banheiros" type="number" defaultValue={valores?.banheiros} />
        <Campo rotulo="Vagas" name="vagas" type="number" defaultValue={valores?.vagas} />
        <Campo rotulo="Andar" name="andar" type="number" defaultValue={valores?.andar} />
        <Campo rotulo="Ano de construção" name="anoConstrucao" type="number" defaultValue={valores?.anoConstrucao} />
      </Secao>

      <div className="flex flex-wrap gap-6">
        <Checkbox name="aceitaFinanciamento" rotulo="Aceita financiamento" marcado={valores?.aceitaFinanciamento} />
        <Checkbox name="aceitaPermuta" rotulo="Aceita permuta" marcado={valores?.aceitaPermuta} />
        <Checkbox name="mobiliado" rotulo="Mobiliado" marcado={valores?.mobiliado} />
      </div>

      <Campo
        rotulo="Características (separadas por vírgula)"
        name="caracteristicas"
        defaultValue={valores?.caracteristicas.join(", ")}
        placeholder="piscina, churrasqueira, portaria 24h"
      />

      <Secao titulo="Endereço">
        <Campo rotulo="CEP" name="cep" defaultValue={valores?.cep} />
        <Campo rotulo="Logradouro" name="logradouro" defaultValue={valores?.logradouro} />
        <Campo rotulo="Número" name="numero" defaultValue={valores?.numero} />
        <Campo rotulo="Complemento" name="complemento" defaultValue={valores?.complemento} />
        <Campo rotulo="Bairro" name="bairro" defaultValue={valores?.bairro} />
        <Campo rotulo="Cidade" name="cidade" defaultValue={valores?.cidade} />
        <Campo rotulo="UF" name="estado" defaultValue={valores?.estado} maxLength={2} />
      </Secao>

      <Campo
        rotulo="Link do tour virtual"
        name="tourVirtualUrl"
        defaultValue={valores?.tourVirtualUrl}
        placeholder="https://…"
      />

      {proprietarios.length > 0 && (
        <div>
          <span className={CLASSE_ROTULO}>Proprietários</span>
          <div className="grid gap-1.5 rounded-sm border border-rule p-3 sm:grid-cols-2">
            {proprietarios.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="proprietarioIds" value={p.id} defaultChecked={selecionados.has(p.id)} />
                <span>{p.nome}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <Mensagem erro={erro} />

      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => router.back()} className={CLASSE_BOTAO_NEUTRO}>
          Cancelar
        </button>
        <button type="submit" disabled={pending} className={CLASSE_BOTAO_PRIMARIO}>
          {pending ? "Salvando…" : modo === "novo" ? "Cadastrar imóvel" : "Salvar alterações"}
        </button>
      </div>
    </form>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-md border border-rule p-4">
      <legend className="px-1 text-sm font-medium text-ink-soft">{titulo}</legend>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </fieldset>
  );
}

function Checkbox({ name, rotulo, marcado }: { name: string; rotulo: string; marcado?: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" name={name} defaultChecked={marcado} />
      <span>{rotulo}</span>
    </label>
  );
}
