import { Paciente, StatusPaciente } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  calcularAderenciaSemana,
  calcularSaldoDoDia,
  estaForaDaMeta,
  limitesDaSemanaEmSaoPaulo,
  limitesDoDiaEmSaoPaulo,
  type SaldoDoDia,
} from "@/lib/nutri/aderencia";

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

export interface PacienteComAderencia {
  paciente: Paciente;
  saldoHoje: SaldoDoDia;
  saldoSemana: SaldoDoDia;
  foraDaMeta: boolean;
}

/** Painel de aderência do nutricionista: cada paciente ativo com % da meta batida hoje/semana. */
export async function buscarPacientesComAderencia(nutricionistaId: string): Promise<PacienteComAderencia[]> {
  const pacientes = await buscarPacientesDoNutricionista(nutricionistaId);
  const { inicio: inicioHoje, fim: fimHoje } = limitesDoDiaEmSaoPaulo();
  const { inicio: inicioSemana, diasDecorridos } = limitesDaSemanaEmSaoPaulo();

  return Promise.all(
    pacientes.map(async (paciente) => {
      const [registrosHoje, registrosSemana] = await Promise.all([
        prisma.registroRefeicao.findMany({
          where: { pacienteId: paciente.id, registradoEm: { gte: inicioHoje, lt: fimHoje } },
        }),
        prisma.registroRefeicao.findMany({
          where: { pacienteId: paciente.id, registradoEm: { gte: inicioSemana, lt: fimHoje } },
        }),
      ]);

      const saldoHoje = calcularSaldoDoDia(registrosHoje, paciente);
      const saldoSemana = calcularAderenciaSemana(registrosSemana, paciente, diasDecorridos);

      return { paciente, saldoHoje, saldoSemana, foraDaMeta: estaForaDaMeta(saldoHoje.kcal.percentual) };
    }),
  );
}
