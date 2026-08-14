import type { EstagioLead } from "@prisma/client";
import { rotuloEstagio, TODOS_ESTAGIOS } from "@/lib/crm/funil";

const TOM_ETIQUETA: Record<string, string> = {
  neutro: "bg-paper text-ink-soft border-rule",
  andamento: "bg-attention-bg text-attention border-attention-line",
  quente: "bg-brass/15 text-brass-deep border-brass/40",
  ganho: "bg-calm-bg text-calm border-calm-line",
  perda: "bg-urgent-bg text-urgent border-urgent-line",
};

// Etiqueta colorida do estágio do lead — mesma linguagem visual em todo lugar
// que mostra um lead (lista e detalhe).
export function EtiquetaEstagio({ estagio }: { estagio: EstagioLead }) {
  const meta = TODOS_ESTAGIOS.find((m) => m.estagio === estagio);
  const classe = TOM_ETIQUETA[meta?.tom ?? "neutro"] ?? TOM_ETIQUETA.neutro;
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${classe}`}>
      {rotuloEstagio(estagio)}
    </span>
  );
}
