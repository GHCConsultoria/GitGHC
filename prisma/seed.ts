import { PrismaClient, RoleUsuario, TipoFeriado, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
  "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
  "SP", "SE", "TO",
] as const;

// Feriados nacionais fixados em lei (Lei 10.607/2002, Lei 9.093/1995, Lei
// 14.759/2023). Carnaval e Corpus Christi são pontos facultativos de âmbito
// federal, não feriados por lei: a adesão do tribunal varia, por isso entram
// como SUSPENSAO com descrição explícita, e não como FERIADO certo — cabe
// revisão humana antes de confiar neles para cálculo de prazo.
const FERIADOS_NACIONAIS_2026: Array<{
  data: string;
  descricao: string;
  tipo: TipoFeriado;
}> = [
  { data: "2026-01-01", descricao: "Confraternização Universal", tipo: TipoFeriado.FERIADO },
  { data: "2026-02-16", descricao: "Carnaval (segunda-feira) — ponto facultativo nacional, confirmar adesão do tribunal", tipo: TipoFeriado.SUSPENSAO },
  { data: "2026-02-17", descricao: "Carnaval (terça-feira) — ponto facultativo nacional, confirmar adesão do tribunal", tipo: TipoFeriado.SUSPENSAO },
  { data: "2026-04-03", descricao: "Sexta-feira Santa (Paixão de Cristo)", tipo: TipoFeriado.FERIADO },
  { data: "2026-04-21", descricao: "Tiradentes", tipo: TipoFeriado.FERIADO },
  { data: "2026-05-01", descricao: "Dia do Trabalho", tipo: TipoFeriado.FERIADO },
  { data: "2026-06-04", descricao: "Corpus Christi — ponto facultativo nacional, confirmar adesão do tribunal", tipo: TipoFeriado.SUSPENSAO },
  { data: "2026-09-07", descricao: "Independência do Brasil", tipo: TipoFeriado.FERIADO },
  { data: "2026-10-12", descricao: "Nossa Senhora Aparecida", tipo: TipoFeriado.FERIADO },
  { data: "2026-11-02", descricao: "Finados", tipo: TipoFeriado.FERIADO },
  { data: "2026-11-15", descricao: "Proclamação da República", tipo: TipoFeriado.FERIADO },
  { data: "2026-11-20", descricao: "Dia Nacional de Zumbi e da Consciência Negra", tipo: TipoFeriado.FERIADO },
  { data: "2026-12-25", descricao: "Natal", tipo: TipoFeriado.FERIADO },
];

function diasEntre(inicioIso: string, fimIso: string): string[] {
  const dias: string[] = [];
  const cursor = new Date(`${inicioIso}T00:00:00Z`);
  const limite = new Date(`${fimIso}T00:00:00Z`);
  while (cursor <= limite) {
    dias.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dias;
}

// Recesso forense (art. 220, CPC): 20/12 a 20/01. Cobre as duas viradas de
// ano que tocam 2026 (fim de 2025→início de 2026 e fim de 2026→início de 2027),
// já que prazos calculados perto de qualquer uma das duas bordas precisam do
// recesso completo.
const RECESSO_DIAS = [
  ...diasEntre("2025-12-20", "2026-01-20"),
  ...diasEntre("2026-12-20", "2027-01-20"),
];

async function seedEscritorioEUsuario() {
  const escritorio = await prisma.escritorio.upsert({
    where: { id: "escritorio-demo" },
    update: {},
    create: {
      id: "escritorio-demo",
      nome: "Escritório Demo",
      oab: "123456/SP",
      uf: "SP",
    },
  });

  await prisma.usuario.upsert({
    where: { authUserId: "demo-advogado-auth-id" },
    update: {},
    create: {
      authUserId: "demo-advogado-auth-id",
      nome: "Advogado Demo",
      email: "advogado.demo@example.com",
      role: RoleUsuario.ADVOGADO,
      escritorioId: escritorio.id,
    },
  });
}

// FeriadoForense usa uf + tribunal (nullable) + data como chave lógica, mas
// Postgres não considera duas linhas com tribunal NULL como duplicatas em uma
// unique constraint — então o guard abaixo evita rodar a semeadura duas vezes,
// em vez de depender de skipDuplicates/upsert na constraint.
async function seedFeriadosNacionais() {
  const jaSemeado = await prisma.feriadoForense.findFirst({
    where: { uf: "SP", tribunal: null, descricao: "Confraternização Universal" },
  });
  if (jaSemeado) {
    console.log("Feriados nacionais já semeados, pulando.");
    return;
  }

  const registros: Prisma.FeriadoForenseCreateManyInput[] = [];
  for (const uf of UFS) {
    for (const feriado of FERIADOS_NACIONAIS_2026) {
      registros.push({
        uf,
        tribunal: null,
        data: new Date(`${feriado.data}T00:00:00Z`),
        descricao: feriado.descricao,
        tipo: feriado.tipo,
      });
    }
    for (const dia of RECESSO_DIAS) {
      registros.push({
        uf,
        tribunal: null,
        data: new Date(`${dia}T00:00:00Z`),
        descricao: "Recesso forense (art. 220, CPC)",
        tipo: TipoFeriado.RECESSO,
      });
    }
  }

  await prisma.feriadoForense.createMany({ data: registros });
  console.log(`Semeados ${registros.length} feriados/recesso nacionais para ${UFS.length} UFs.`);
}

async function main() {
  await seedEscritorioEUsuario();
  await seedFeriadosNacionais();

  // TODO(feriados estaduais/tribunal): esta seed cobre apenas o calendário
  // NACIONAL (aplicável a toda UF, tribunal = null). Feriados estaduais,
  // forais e suspensões específicas de cada tribunal (TJSP, TRF3, TRT2 etc.)
  // não são inferíveis e precisam ser cadastrados manualmente em
  // FeriadoForense com o campo `tribunal` preenchido. Enquanto uma UF não
  // tiver seu calendário revisado, o motor de prazo (Fase 3) deve recusar o
  // cálculo automático e mandar para revisão manual.
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
