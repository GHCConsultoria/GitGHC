import { CLASSE_INPUT } from "@/components/imob/primitivos";

/**
 * Formulário de busca por GET (server-side): submete recarregando a página com
 * ?busca=... — mantém a busca no servidor, sem estado de cliente. Campos extra
 * (filtros) podem ser passados como hidden via `preservar`.
 */
export function BuscaForm({
  action,
  valor,
  placeholder,
  preservar,
}: {
  action: string;
  valor?: string;
  placeholder: string;
  preservar?: Record<string, string>;
}) {
  return (
    <form action={action} method="get" className="flex gap-2">
      {preservar &&
        Object.entries(preservar).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <input
        type="search"
        name="busca"
        defaultValue={valor}
        placeholder={placeholder}
        className={`${CLASSE_INPUT} max-w-xs`}
      />
      <button type="submit" className="rounded-sm border border-rule px-4 py-2 text-sm hover:bg-paper-raised">
        Buscar
      </button>
    </form>
  );
}
