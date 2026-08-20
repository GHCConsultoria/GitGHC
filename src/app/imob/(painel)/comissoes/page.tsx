import { redirect } from "next/navigation";
import { ComissoesClient } from "@/components/imob/ComissoesClient";
import { obterSessaoImob } from "@/lib/imob/auth";
import { listarCorretoresParaSelecao } from "@/lib/imob/consultas-crm";
import { listarComissoes, listarVendasParaComissao, resumoComissoes } from "@/lib/imob/consultas-financeiro";
import { centavosParaReais } from "@/lib/imob/formato";
import { temPermissao } from "@/lib/imob/rbac";

export const dynamic = "force-dynamic";

export default async function ComissoesPage() {
  const sessao = await obterSessaoImob();
  if (!temPermissao(sessao.papel.permissoes, "comissoes.ver")) {
    redirect("/imob");
  }
  const [comissoes, corretores, vendas, resumo] = await Promise.all([
    listarComissoes(sessao.imobiliariaId),
    listarCorretoresParaSelecao(sessao.imobiliariaId),
    listarVendasParaComissao(sessao.imobiliariaId),
    resumoComissoes(sessao.imobiliariaId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="eyebrow">Financeiro</p>
        <h1 className="font-display text-3xl">Comissões</h1>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <Cartao rotulo="Previstas" valor={centavosParaReais(resumo.prevista)} />
        <Cartao rotulo="Aprovadas" valor={centavosParaReais(resumo.aprovada)} />
        <Cartao rotulo="Pagas" valor={centavosParaReais(resumo.paga)} cor="text-brass-deep" />
      </section>

      <ComissoesClient
        podeCriar={temPermissao(sessao.papel.permissoes, "comissoes.criar")}
        podeEditar={temPermissao(sessao.papel.permissoes, "comissoes.editar")}
        comissoes={comissoes.map((c) => ({
          id: c.id,
          tipo: c.tipo,
          status: c.status,
          percentual: c.percentual,
          valorPrevisto: c.valorPrevisto,
          valorAprovado: c.valorAprovado,
          valorPago: c.valorPago,
          corretorNome: c.corretorNome,
        }))}
        opcoes={{
          corretores: corretores.map((c) => ({ id: c.id, nome: c.nome })),
          vendas: vendas.map((v) => ({ id: v.id, nome: `${centavosParaReais(v.valorVenda)}` })),
        }}
      />
    </div>
  );
}

function Cartao({ rotulo, valor, cor }: { rotulo: string; valor: string; cor?: string }) {
  return (
    <div className="paper-card rounded-md p-5">
      <p className="eyebrow">{rotulo}</p>
      <p className={`font-display mt-2 text-2xl ${cor ?? ""}`}>{valor}</p>
    </div>
  );
}
