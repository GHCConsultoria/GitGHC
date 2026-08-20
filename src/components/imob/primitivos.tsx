"use client";

/**
 * Primitivos de UI reutilizados nas telas da Fase 2 (proprietários, clientes,
 * imóveis). Mantém os componentes de tela enxutos e a aparência consistente.
 */

export const CLASSE_INPUT =
  "w-full rounded-sm border border-rule bg-paper-raised px-3 py-2 text-sm outline-none focus:border-brass disabled:opacity-60";
export const CLASSE_ROTULO = "eyebrow mb-1 block";
export const CLASSE_BOTAO_PRIMARIO =
  "rounded-sm bg-brass px-4 py-2 text-sm font-medium text-brass-on hover:bg-brass-deep disabled:opacity-50";
export const CLASSE_BOTAO_NEUTRO = "rounded-sm border border-rule px-4 py-2 text-sm";

export function Campo({
  rotulo,
  name,
  defaultValue,
  type = "text",
  required,
  disabled,
  placeholder,
  maxLength,
}: {
  rotulo: string;
  name: string;
  defaultValue?: string | number | null;
  type?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <label className="text-sm">
      <span className={CLASSE_ROTULO}>{rotulo}</span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue ?? undefined}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        maxLength={maxLength}
        className={CLASSE_INPUT}
      />
    </label>
  );
}

export function CampoSelect({
  rotulo,
  name,
  opcoes,
  defaultValue,
  incluirVazio,
  required,
}: {
  rotulo: string;
  name: string;
  opcoes: Array<{ valor: string; rotulo: string }>;
  defaultValue?: string;
  incluirVazio?: string;
  required?: boolean;
}) {
  return (
    <label className="text-sm">
      <span className={CLASSE_ROTULO}>{rotulo}</span>
      <select name={name} defaultValue={defaultValue ?? ""} required={required} className={CLASSE_INPUT}>
        {incluirVazio !== undefined && <option value="">{incluirVazio}</option>}
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
    </label>
  );
}

export function CampoTextarea({
  rotulo,
  name,
  defaultValue,
  rows = 3,
}: {
  rotulo: string;
  name: string;
  defaultValue?: string | null;
  rows?: number;
}) {
  return (
    <label className="text-sm">
      <span className={CLASSE_ROTULO}>{rotulo}</span>
      <textarea name={name} defaultValue={defaultValue ?? ""} rows={rows} className={CLASSE_INPUT} />
    </label>
  );
}

export function Modal({
  titulo,
  onFechar,
  children,
  largura = "max-w-lg",
}: {
  titulo: string;
  onFechar: () => void;
  children: React.ReactNode;
  largura?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="Fechar" onClick={onFechar} className="absolute inset-0 bg-black/40" />
      <div className={`paper-card relative z-10 flex max-h-[88vh] w-full ${largura} flex-col rounded-md`}>
        <h2 className="font-display shrink-0 border-b border-rule px-6 py-4 text-xl">{titulo}</h2>
        <div className="overflow-y-auto px-6 py-4">{children}</div>
      </div>
    </div>
  );
}

/** Barra de mensagens de erro/sucesso padronizada. */
export function Mensagem({ erro, ok }: { erro?: string | null; ok?: string | null }) {
  if (erro) return <p className="text-sm text-urgent">{erro}</p>;
  if (ok) return <p className="text-sm text-brass-deep">{ok}</p>;
  return null;
}
