import { redirect } from "next/navigation";
import { VendasClient } from "@/components/imob/VendasClient";
import { obterSessaoImob } from "@/lib/imob/auth";
import {
  listarClientesParaSelecao,
  listarImoveisParaSelecao,
  listarProprietariosParaSelecao,
} from "@/lib/imob/consultas";
import { listarCorretoresParaSelecao } from "@/lib/imob/consultas-crm";
import { listarVendas } from "@/lib/imob/consultas-fin";
import { temPermissao } from "@/lib/imob/rbac";

export const dynamic = "force-dynamic";

export default async function VendasPage() {
  const sessao = await obterSessaoImob();
  if (!temPermissao(sessao.papel.permissoes, "vendas.ver")) {
    redirect("/imob");
  }
  const [vendas, imoveis, clientes, proprietarios, corretores] = await Promise.all([
    listarVendas(sessao.imobiliariaId),
    listarImoveisParaSelecao(sessao.imobiliariaId),
    listarClientesParaSelecao(sessao.imobiliariaId),
    listarProprietariosParaSelecao(sessao.imobiliariaId),
    listarCorretoresParaSelecao(sessao.imobiliariaId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="eyebrow">Fechamento</p>
        <h1 className="font-display text-3xl">Vendas</h1>
      </header>
      <VendasClient
        podeCriar={temPermissao(sessao.papel.permissoes, "vendas.criar")}
        vendas={vendas.map((v) => ({
          id: v.id,
          data: v.data.toISOString(),
          valorVenda: v.valorVenda,
          comissaoValor: v.comissaoValor,
          imovelCodigo: v.imovelCodigo,
          clienteNome: v.clienteNome,
          corretorNome: v.corretorNome,
        }))}
        opcoes={{
          imoveis: imoveis.map((i) => ({ id: i.id, nome: `${i.codigo} — ${i.titulo}` })),
          clientes: clientes.map((c) => ({ id: c.id, nome: c.nome })),
          proprietarios: proprietarios.map((p) => ({ id: p.id, nome: p.nome })),
          corretores: corretores.map((c) => ({ id: c.id, nome: c.nome })),
        }}
      />
    </div>
  );
}
