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
import { arquivarCliente, criarCliente, editarCliente } from "@/lib/imob/acoes-cadastros";
import { centavosParaInput } from "@/lib/imob/formato";
import { ROTULO_FINALIDADE, ROTULO_TIPO_CLIENTE, ROTULO_TIPO_IMOVEL, ROTULO_TIPO_PESSOA } from "@/lib/imob/rotulos";

export interface ClienteView {
  id: string;
  nome: string;
  tipo: string;
  tipoPessoa: "FISICA" | "JURIDICA";
  documento: string | null;
  email: string | null;
  telefone: string | null;
  whatsapp: string | null;
  dataNascimento: string | null;
  profissao: string | null;
  estadoCivil: string | null;
  endereco: string | null;
  observacoes: string | null;
  prefTipoImovel: string | null;
  prefFinalidade: string | null;
  prefValorMin: number | null;
  prefValorMax: number | null;
  prefCidade: string | null;
  prefBairro: string | null;
  prefQuartos: number | null;
  prefSuites: number | null;
  prefVagas: number | null;
  prefAreaMinima: number | null;
}

interface Props {
  podeCriar: boolean;
  podeEditar: boolean;
  podeExcluir: boolean;
  clientes: ClienteView[];
}

const opcoes = (mapa: Record<string, string>) => Object.entries(mapa).map(([valor, rotulo]) => ({ valor, rotulo }));

export function ClientesClient({ podeCriar, podeEditar, podeExcluir, clientes }: Props) {
  const [form, setForm] = useState<{ tipo: "novo" } | { tipo: "editar"; item: ClienteView } | null>(null);
  const [pending, start] = useTransition();

  function arquivar(item: ClienteView) {
    if (!confirm(`Arquivar o cliente "${item.nome}"?`)) return;
    const fd = new FormData();
    fd.set("id", item.id);
    start(async () => {
      await arquivarCliente(fd);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {podeCriar && (
        <div className="flex justify-end">
          <button type="button" onClick={() => setForm({ tipo: "novo" })} className={CLASSE_BOTAO_PRIMARIO}>
            + Novo cliente
          </button>
        </div>
      )}

      {clientes.length === 0 ? (
        <div className="paper-card rounded-md p-10 text-center text-sm text-ink-soft">Nenhum cliente encontrado.</div>
      ) : (
        <div className="paper-card overflow-x-auto rounded-md">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-rule text-left text-ink-soft">
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Contato</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {clientes.map((c) => (
                <tr key={c.id} className="border-b border-rule/60 last:border-0">
                  <td className="px-4 py-3 font-medium">{c.nome}</td>
                  <td className="px-4 py-3 text-ink-soft">{ROTULO_TIPO_CLIENTE[c.tipo] ?? c.tipo}</td>
                  <td className="px-4 py-3 text-ink-soft">{c.telefone || c.email || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      {podeEditar && (
                        <button
                          type="button"
                          onClick={() => setForm({ tipo: "editar", item: c })}
                          className="text-ink-soft hover:text-ink hover:underline"
                        >
                          Editar
                        </button>
                      )}
                      {podeExcluir && (
                        <button
                          type="button"
                          onClick={() => arquivar(c)}
                          disabled={pending}
                          className="text-ink-soft hover:text-urgent hover:underline disabled:opacity-50"
                        >
                          Arquivar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {form && <ModalCliente item={form.tipo === "editar" ? form.item : null} onFechar={() => setForm(null)} />}
    </div>
  );
}

function ModalCliente({ item, onFechar }: { item: ClienteView | null; onFechar: () => void }) {
  const editando = item !== null;
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = editando ? await editarCliente(fd) : await criarCliente(fd);
      if (r.sucesso) onFechar();
      else setErro(r.erro);
    });
  }

  return (
    <Modal titulo={editando ? "Editar cliente" : "Novo cliente"} onFechar={onFechar} largura="max-w-2xl">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {editando && <input type="hidden" name="id" value={item.id} />}
        <Campo rotulo="Nome" name="nome" defaultValue={item?.nome} required />
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoSelect
            rotulo="Tipo de cliente"
            name="tipo"
            opcoes={opcoes(ROTULO_TIPO_CLIENTE)}
            defaultValue={item?.tipo ?? "INTERESSADO"}
          />
          <CampoSelect
            rotulo="Tipo de pessoa"
            name="tipoPessoa"
            opcoes={opcoes(ROTULO_TIPO_PESSOA)}
            defaultValue={item?.tipoPessoa ?? "FISICA"}
          />
          <Campo rotulo="CPF/CNPJ" name="documento" defaultValue={item?.documento} />
          <Campo rotulo="E-mail" name="email" type="email" defaultValue={item?.email} />
          <Campo rotulo="Telefone" name="telefone" defaultValue={item?.telefone} />
          <Campo rotulo="WhatsApp" name="whatsapp" defaultValue={item?.whatsapp} />
          <Campo
            rotulo="Data de nascimento"
            name="dataNascimento"
            type="date"
            defaultValue={item?.dataNascimento ?? undefined}
          />
          <Campo rotulo="Profissão" name="profissao" defaultValue={item?.profissao} />
          <Campo rotulo="Estado civil" name="estadoCivil" defaultValue={item?.estadoCivil} />
          <Campo rotulo="Endereço" name="endereco" defaultValue={item?.endereco} />
        </div>

        <fieldset className="rounded-sm border border-rule p-3">
          <legend className="px-1 text-xs font-medium text-ink-soft">Preferências de imóvel</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <CampoSelect
              rotulo="Tipo"
              name="prefTipoImovel"
              opcoes={opcoes(ROTULO_TIPO_IMOVEL)}
              incluirVazio="Sem preferência"
              defaultValue={item?.prefTipoImovel ?? ""}
            />
            <CampoSelect
              rotulo="Finalidade"
              name="prefFinalidade"
              opcoes={opcoes(ROTULO_FINALIDADE)}
              incluirVazio="Sem preferência"
              defaultValue={item?.prefFinalidade ?? ""}
            />
            <Campo
              rotulo="Valor mínimo (R$)"
              name="prefValorMin"
              defaultValue={centavosParaInput(item?.prefValorMin)}
              placeholder="0,00"
            />
            <Campo
              rotulo="Valor máximo (R$)"
              name="prefValorMax"
              defaultValue={centavosParaInput(item?.prefValorMax)}
              placeholder="0,00"
            />
            <Campo rotulo="Cidade" name="prefCidade" defaultValue={item?.prefCidade} />
            <Campo rotulo="Bairro" name="prefBairro" defaultValue={item?.prefBairro} />
            <Campo rotulo="Quartos (mín.)" name="prefQuartos" type="number" defaultValue={item?.prefQuartos} />
            <Campo rotulo="Suítes (mín.)" name="prefSuites" type="number" defaultValue={item?.prefSuites} />
            <Campo rotulo="Vagas (mín.)" name="prefVagas" type="number" defaultValue={item?.prefVagas} />
            <Campo rotulo="Área mínima (m²)" name="prefAreaMinima" type="number" defaultValue={item?.prefAreaMinima} />
          </div>
        </fieldset>

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
