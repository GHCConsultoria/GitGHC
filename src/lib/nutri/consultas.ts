import { StatusPaciente } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function buscarPacientesDoNutricionista(nutricionistaId: string) {
  return prisma.paciente.findMany({
    where: { nutricionistaId, status: StatusPaciente.ATIVO },
    orderBy: { criadoEm: "desc" },
  });
}

export async function buscarPacientePorId(pacienteId: string, nutricionistaId: string) {
  const paciente = await prisma.paciente.findUnique({ where: { id: pacienteId } });
  if (!paciente || paciente.nutricionistaId !== nutricionistaId) {
    return null;
  }
  return paciente;
}
