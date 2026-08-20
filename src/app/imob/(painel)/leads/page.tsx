import { redirect } from "next/navigation";
import { KanbanLeads } from "@/components/imob/KanbanLeads";
import { obterSessaoImob } from "@/lib/imob/auth";
import { listarClientesParaSelecao, listarImoveisParaSelecao } from "@/lib/imob/consultas";
import { leadsAgrupadosPorEtapa, listarCorretoresParaSelecao } from "@/lib/imob/consultas-crm";
import { temPermissao } from "@/lib/imob/rbac";
import { ETAPAS_LEAD } from "@/lib/imob/schemas";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const sessao = await obterSessaoImob();
  if (!temPermissao(sessao.papel.permissoes, "leads.ver")) {
    redirect("/imob");
  }

  const [colunas, corretores, imoveis, clientes] = await Promise.all([
    leadsAgrupadosPorEtapa(sessao.imobiliariaId),
    listarCorretoresParaSelecao(sessao.imobiliariaId),
    listarImoveisParaSelecao(sessao.imobiliariaId),
    listarClientesParaSelecao(sessao.imobiliariaId),
  ]);

  const colunasObj: Record<string, ReturnType<typeof mapCard>[]> = {};
  for (const etapa of ETAPAS_LEAD) {
    colunasObj[etapa] = (colunas.get(etapa) ?? []).map(mapCard);
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="eyebrow">CRM</p>
        <h1 className="font-display text-3xl">Leads</h1>
      </header>
      <KanbanLeads
        etapas={[...ETAPAS_LEAD]}
        colunas={colunasObj}
        podeCriar={temPermissao(sessao.papel.permissoes, "leads.criar")}
        podeEditar={temPermissao(sessao.papel.permissoes, "leads.editar")}
        opcoes={{
          corretores: corretores.map((c) => ({ id: c.id, nome: c.nome })),
          imoveis: imoveis.map((i) => ({ id: i.id, nome: `${i.codigo} — ${i.titulo}` })),
          clientes: clientes.map((c) => ({ id: c.id, nome: c.nome })),
        }}
      />
    </div>
  );
}

function mapCard(c: {
  id: string;
  nome: string;
  etapa: string;
  origem: string;
  telefone: string | null;
  valorPretendido: number | null;
  corretorNome: string | null;
  imovelCodigo: string | null;
}) {
  return {
    id: c.id,
    nome: c.nome,
    etapa: c.etapa,
    origem: c.origem,
    telefone: c.telefone,
    valorPretendido: c.valorPretendido,
    corretorNome: c.corretorNome,
    imovelCodigo: c.imovelCodigo,
  };
}
