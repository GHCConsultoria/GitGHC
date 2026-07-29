import { StatusPaciente } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { limitesDoDiaEmSaoPaulo } from "@/lib/nutri/aderencia";

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

/** Busca pública por token — usada pela página /p/[token], sem checagem de nutricionista. */
export async function buscarPacientePorToken(token: string) {
  const paciente = await prisma.paciente.findUnique({ where: { tokenAcesso: token } });
  if (!paciente || paciente.status !== StatusPaciente.ATIVO) {
    return null;
  }
  return paciente;
}

export async function buscarRegistrosDeHoje(pacienteId: string) {
  const { inicio, fim } = limitesDoDiaEmSaoPaulo();
  return prisma.registroRefeicao.findMany({
    where: { pacienteId, registradoEm: { gte: inicio, lt: fim } },
    orderBy: { registradoEm: "asc" },
  });
}
