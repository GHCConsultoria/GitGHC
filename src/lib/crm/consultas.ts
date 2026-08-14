import type { LeadParaBI } from "@/lib/crm/funil";
import { prisma } from "@/lib/prisma";

// Todas as consultas são escopadas por escritorioId — o tenant vem sempre da
// sessão (ver auth.ts), nunca do cliente, pra um escritório não enxergar lead
// de outro.

export function buscarLeadsDoEscritorio(escritorioId: string) {
  return prisma.leadComercial.findMany({
    where: { escritorioId },
    include: {
      responsavel: { select: { id: true, nome: true } },
      motivoPerda: { select: { id: true, descricao: true } },
      _count: { select: { visitas: true, proximosPassos: true } },
    },
    orderBy: { atualizadoEm: "desc" },
  });
}

// Projeção enxuta para o BI: só os campos que as agregações puras consomem
// (ver src/lib/crm/funil.ts). Faz o mapeamento motivoPerda -> descricao aqui,
// mantendo as funções de BI ignorantes do Prisma.
export async function buscarLeadsParaBI(escritorioId: string): Promise<LeadParaBI[]> {
  const leads = await prisma.leadComercial.findMany({
    where: { escritorioId },
    select: {
      estagio: true,
      origem: true,
      nicho: true,
      valorPotencialCentavos: true,
      valorFechadoCentavos: true,
      motivoPerda: { select: { descricao: true } },
    },
  });
  return leads.map((lead) => ({
    estagio: lead.estagio,
    origem: lead.origem,
    nicho: lead.nicho,
    valorPotencialCentavos: lead.valorPotencialCentavos,
    valorFechadoCentavos: lead.valorFechadoCentavos,
    motivoPerdaDescricao: lead.motivoPerda?.descricao ?? null,
  }));
}

export function buscarLeadPorId(id: string, escritorioId: string) {
  return prisma.leadComercial.findFirst({
    where: { id, escritorioId },
    include: {
      responsavel: { select: { id: true, nome: true } },
      motivoPerda: { select: { id: true, descricao: true } },
      visitas: {
        orderBy: { dataVisita: "desc" },
        include: { registradoPor: { select: { id: true, nome: true } } },
      },
      proximosPassos: {
        orderBy: [{ status: "asc" }, { dataPrevista: "asc" }],
        include: { responsavel: { select: { id: true, nome: true } } },
      },
    },
  });
}

export function buscarMotivosPerdaAtivos(escritorioId: string) {
  return prisma.motivoPerdaComercial.findMany({
    where: { escritorioId, ativo: true },
    orderBy: { descricao: "asc" },
  });
}

// Próximos passos pendentes de todo o escritório, com o lead junto — alimenta
// a agenda comercial. Ordenado pela data prevista (o que vence antes primeiro).
export function buscarProximosPassosPendentes(escritorioId: string) {
  return prisma.proximoPassoComercial.findMany({
    where: { status: "PENDENTE", lead: { escritorioId } },
    include: {
      lead: { select: { id: true, nomeEmpresa: true, cidade: true, uf: true } },
      responsavel: { select: { id: true, nome: true } },
    },
    orderBy: { dataPrevista: "asc" },
  });
}

export type PassoDaAgenda = Awaited<ReturnType<typeof buscarProximosPassosPendentes>>[number];

// Visitas desde uma data de corte — para o gráfico de visitas por dia no BI.
export function buscarVisitasDesde(escritorioId: string, desde: Date) {
  return prisma.visitaComercial.findMany({
    where: { lead: { escritorioId }, dataVisita: { gte: desde } },
    select: { dataVisita: true },
  });
}
