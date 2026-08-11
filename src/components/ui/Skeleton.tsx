/** Bloco de placeholder pra loading.tsx e estados de carregamento client-side. Ver `.skeleton` em globals.css. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton ${className}`} />;
}
