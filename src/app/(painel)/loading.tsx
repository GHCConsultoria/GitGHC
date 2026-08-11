import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Next.js mostra isto automaticamente enquanto a página da rota (Server
 * Component assíncrono) ainda está buscando dado — sem JS nenhum do nosso
 * lado. Formato aproximado do Dashboard (cabeçalho + resumo + listas), pra
 * não pular o layout quando o conteúdo de verdade chegar.
 */
export default function CarregandoPainel() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-14 px-6 py-10 sm:px-10 sm:py-14">
      <header className="flex flex-col gap-3">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </header>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {["vencendo", "aguardando", "confirmados", "risco"].map((chave) => (
          <div key={chave} className="paper-card rounded-sm p-4">
            <Skeleton className="mb-3 h-8 w-12" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <Skeleton className="h-4 w-24" />
        {["risco-1", "risco-2"].map((chave) => (
          <Skeleton key={chave} className="h-20 w-full" />
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <Skeleton className="h-4 w-32" />
        {["item-1", "item-2", "item-3"].map((chave) => (
          <Skeleton key={chave} className="h-14 w-full" />
        ))}
      </section>
    </main>
  );
}
