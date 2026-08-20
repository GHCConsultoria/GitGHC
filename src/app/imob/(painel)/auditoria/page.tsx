import { redirect } from "next/navigation";
import { obterSessaoImob } from "@/lib/imob/auth";
import { listarAuditoria } from "@/lib/imob/consultas";
import { temPermissao } from "@/lib/imob/rbac";

export const dynamic = "force-dynamic";

export default async function AuditoriaPage() {
  const sessao = await obterSessaoImob();
  if (!temPermissao(sessao.papel.permissoes, "auditoria.ver")) {
    redirect("/imob");
  }

  const logs = await listarAuditoria(sessao.imobiliariaId, 100);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="eyebrow">Registro imutável</p>
        <h1 className="font-display text-3xl">Auditoria</h1>
        <p className="mt-1 text-sm text-ink-soft">Últimas 100 ações registradas na sua imobiliária.</p>
      </header>

      {logs.length === 0 ? (
        <div className="paper-card rounded-md p-10 text-center text-sm text-ink-soft">
          Nenhuma ação registrada ainda.
        </div>
      ) : (
        <div className="paper-card overflow-x-auto rounded-md">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-rule text-left text-ink-soft">
                <th className="px-4 py-3 font-medium">Quando</th>
                <th className="px-4 py-3 font-medium">Autor</th>
                <th className="px-4 py-3 font-medium">Ação</th>
                <th className="px-4 py-3 font-medium">Entidade</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-rule/60 last:border-0">
                  <td className="px-4 py-3 text-ink-soft">
                    {log.criadoEm.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                  </td>
                  <td className="px-4 py-3">{log.usuario?.nome ?? "Sistema"}</td>
                  <td className="px-4 py-3">{log.acao}</td>
                  <td className="px-4 py-3 text-ink-soft">
                    {log.entidade} · {log.entidadeId.slice(0, 8)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
