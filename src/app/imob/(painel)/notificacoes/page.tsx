import { NotificacoesClient } from "@/components/imob/NotificacoesClient";
import { obterSessaoImob } from "@/lib/imob/auth";
import { listarNotificacoes } from "@/lib/imob/notificacoes";

export const dynamic = "force-dynamic";

export default async function NotificacoesPage() {
  const sessao = await obterSessaoImob();
  const notificacoes = await listarNotificacoes(sessao.imobiliariaId);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="eyebrow">Central de avisos</p>
        <h1 className="font-display text-3xl">Notificações</h1>
      </header>
      <NotificacoesClient
        notificacoes={notificacoes.map((n) => ({
          id: n.id,
          tipo: n.tipo,
          titulo: n.titulo,
          mensagem: n.mensagem,
          link: n.link,
          lida: n.lida,
          criadoEm: n.criadoEm.toISOString(),
        }))}
      />
    </div>
  );
}
