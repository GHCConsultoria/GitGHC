import { type NextRequest, NextResponse } from "next/server";
import { obterSessaoImob, UsuarioImobNaoAutenticadoError, UsuarioImobNaoCadastradoError } from "@/lib/imob/auth";
import { temPermissao } from "@/lib/imob/rbac";
import { ehTipoRelatorio, gerarRelatorioCsv, permissaoDoRelatorio } from "@/lib/imob/relatorios";

/**
 * Download de relatório em CSV. Autentica pela sessão (tenant), checa a
 * permissão específica do relatório e devolve o arquivo. Fica fora do grupo
 * (painel) porque é um endpoint de arquivo, não uma página.
 */
export async function GET(request: NextRequest) {
  const tipo = request.nextUrl.searchParams.get("tipo") ?? "";
  if (!ehTipoRelatorio(tipo)) {
    return NextResponse.json({ erro: "relatório inválido" }, { status: 400 });
  }

  let sessao: Awaited<ReturnType<typeof obterSessaoImob>>;
  try {
    sessao = await obterSessaoImob();
  } catch (erro) {
    if (erro instanceof UsuarioImobNaoAutenticadoError || erro instanceof UsuarioImobNaoCadastradoError) {
      return NextResponse.json({ erro: "não autenticado" }, { status: 401 });
    }
    throw erro;
  }

  if (!temPermissao(sessao.papel.permissoes, permissaoDoRelatorio(tipo))) {
    return NextResponse.json({ erro: "sem permissão" }, { status: 403 });
  }

  const { nome, csv } = await gerarRelatorioCsv(sessao.imobiliariaId, tipo);
  const dataStr = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="relatorio-${nome}-${dataStr}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
