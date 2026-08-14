import {
  EstagioLead,
  OrigemLead,
  type Prisma,
  PrismaClient,
  ResultadoVisita,
  RoleUsuario,
  TipoFeriado,
} from "@prisma/client";
import { UFS_BRASIL as UFS } from "../src/lib/br/ufs";
import { calcularPrazo } from "../src/lib/prazos/calculo";

const prisma = new PrismaClient();

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
  {
    data: "2026-02-16",
    descricao: "Carnaval (segunda-feira) — ponto facultativo nacional, confirmar adesão do tribunal",
    tipo: TipoFeriado.SUSPENSAO,
  },
  {
    data: "2026-02-17",
    descricao: "Carnaval (terça-feira) — ponto facultativo nacional, confirmar adesão do tribunal",
    tipo: TipoFeriado.SUSPENSAO,
  },
  { data: "2026-04-03", descricao: "Sexta-feira Santa (Paixão de Cristo)", tipo: TipoFeriado.FERIADO },
  { data: "2026-04-21", descricao: "Tiradentes", tipo: TipoFeriado.FERIADO },
  { data: "2026-05-01", descricao: "Dia do Trabalho", tipo: TipoFeriado.FERIADO },
  {
    data: "2026-06-04",
    descricao: "Corpus Christi — ponto facultativo nacional, confirmar adesão do tribunal",
    tipo: TipoFeriado.SUSPENSAO,
  },
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
const RECESSO_DIAS = [...diasEntre("2025-12-20", "2026-01-20"), ...diasEntre("2026-12-20", "2027-01-20")];

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

// Mapeamento inicial tipoAto -> diasPrazo. Tabela configurável (não é
// hardcoded na lógica do motor de prazo) — dá pra adicionar/editar linhas
// aqui ou por uma tela futura sem tocar em src/lib/prazos.
const TIPOS_ATO_PRAZO: Array<{
  tipoAto: string;
  diasPrazo: number;
  contagemDiasUteis: boolean;
  descricao: string;
}> = [
  { tipoAto: "contestacao", diasPrazo: 15, contagemDiasUteis: true, descricao: "Contestação (art. 335, CPC)" },
  { tipoAto: "apelacao", diasPrazo: 15, contagemDiasUteis: true, descricao: "Apelação (art. 1.003, §5º, CPC)" },
  {
    tipoAto: "embargos_de_declaracao",
    diasPrazo: 5,
    contagemDiasUteis: true,
    descricao: "Embargos de declaração (art. 1.023, CPC)",
  },
];

async function seedTiposAtoPrazo() {
  for (const tipo of TIPOS_ATO_PRAZO) {
    await prisma.tipoAtoPrazo.upsert({
      where: { tipoAto: tipo.tipoAto },
      update: {},
      create: tipo,
    });
  }
  console.log(`Semeados ${TIPOS_ATO_PRAZO.length} tipos de ato em TipoAtoPrazo.`);
}

function somarDiasCorridos(data: Date, quantidade: number): Date {
  const resultado = new Date(data.getTime());
  resultado.setUTCDate(resultado.getUTCDate() + quantidade);
  return resultado;
}

// Dados ILUSTRATIVOS para exercitar a tela de confirmação (Fase 4) localmente
// — não são um pipeline real de classificação de tipoAto (isso é o que o
// texto do prompt chama de módulo futuro). O prazo de cada item é calculado
// de verdade pelo motor puro da Fase 3 (calcularPrazo), só a
// dataDisponibilizacao é escolhida a dedo, relativa a "hoje", para ilustrar
// as três faixas do semáforo.
const DEMO_ITENS: Array<{
  sufixo: string;
  cliente: string;
  varaOrgao: string;
  numeroCnj: string;
  tipoAto: string;
  prazoEmDobro: boolean;
  offsetDiasDisponibilizacao: number;
}> = [
  {
    sufixo: "1",
    cliente: "Confecções Bela Vista Ltda.",
    varaOrgao: "3ª Vara Cível de São Paulo",
    numeroCnj: "10000011120268260100",
    tipoAto: "embargos_de_declaracao",
    prazoEmDobro: false,
    offsetDiasDisponibilizacao: -6,
  },
  {
    sufixo: "2",
    cliente: "João Pereira da Silva",
    varaOrgao: "5ª Vara Cível de São Paulo",
    numeroCnj: "20000022220268260100",
    tipoAto: "contestacao",
    prazoEmDobro: false,
    offsetDiasDisponibilizacao: -17,
  },
  {
    sufixo: "3",
    cliente: "Defensoria — Maria Oliveira Santos",
    varaOrgao: "2ª Vara da Fazenda Pública de São Paulo",
    numeroCnj: "30000033320268260100",
    tipoAto: "apelacao",
    prazoEmDobro: true,
    offsetDiasDisponibilizacao: -25,
  },
];

async function seedDadosDemonstracaoPainel() {
  const jaSemeado = await prisma.processo.findUnique({ where: { id: "processo-demo-1" } });
  if (jaSemeado) {
    console.log("Dados de demonstração do painel já semeados, pulando.");
    return;
  }

  const tiposAtoPorNome = new Map(TIPOS_ATO_PRAZO.map((tipo) => [tipo.tipoAto, tipo]));
  const feriadosSp = await prisma.feriadoForense.findMany({
    where: { uf: "SP", tribunal: null },
    select: { data: true },
  });
  const hoje = new Date();
  hoje.setUTCHours(0, 0, 0, 0);

  for (const item of DEMO_ITENS) {
    const configuracaoAto = tiposAtoPorNome.get(item.tipoAto);
    if (!configuracaoAto) throw new Error(`tipoAto de demonstração sem mapeamento: ${item.tipoAto}`);

    const processo = await prisma.processo.create({
      data: {
        id: `processo-demo-${item.sufixo}`,
        escritorioId: "escritorio-demo",
        numeroCnj: item.numeroCnj,
        cliente: item.cliente,
        varaOrgao: item.varaOrgao,
        uf: "SP",
        tribunal: "TJSP",
        prazoEmDobro: item.prazoEmDobro,
        parteRepresentada: "REU",
      },
    });

    const numeroCnjFormatado = `${item.numeroCnj.slice(0, 7)}-${item.numeroCnj.slice(7, 9)}.${item.numeroCnj.slice(9, 13)}.${item.numeroCnj.slice(13, 14)}.${item.numeroCnj.slice(14, 16)}.${item.numeroCnj.slice(16, 20)}`;
    const dataDisponibilizacao = somarDiasCorridos(hoje, item.offsetDiasDisponibilizacao);

    const publicacao = await prisma.publicacao.create({
      data: {
        conteudo: `Intimação nos autos do processo ${numeroCnjFormatado}: fica ${item.cliente} intimado(a) para os fins de direito referente a ${configuracaoAto.descricao ?? item.tipoAto}.`,
        dataDisponibilizacao,
        fonte: "DJEN",
        hashConteudo: `demo-publicacao-${item.sufixo}`,
        status: "VINCULADA",
        processoId: processo.id,
        rawJson: { origem: "seed-demo" },
      },
    });

    const diasPrazo = item.prazoEmDobro ? configuracaoAto.diasPrazo * 2 : configuracaoAto.diasPrazo;
    const resultado = calcularPrazo({
      dataDisponibilizacao,
      diasPrazo,
      contagemDiasUteis: configuracaoAto.contagemDiasUteis,
      uf: "SP",
      tribunal: "TJSP",
      feriados: feriadosSp.map((feriado) => feriado.data),
    });
    if (!resultado.sucesso) {
      throw new Error(`falha ao calcular prazo de demonstração ${item.sufixo}: ${resultado.motivo}`);
    }

    await prisma.prazo.create({
      data: {
        publicacaoId: publicacao.id,
        processoId: processo.id,
        tipoAto: item.tipoAto,
        descricao: configuracaoAto.descricao ?? item.tipoAto,
        dataInicioContagem: resultado.dataInicioContagem,
        diasPrazo,
        contagemDiasUteis: configuracaoAto.contagemDiasUteis,
        dataFatal: resultado.dataFatal,
        detalhesCalculo: resultado.passos as unknown as Prisma.InputJsonValue,
        status: "PENDENTE_CONFIRMACAO",
      },
    });
  }

  await prisma.publicacao.create({
    data: {
      conteudo:
        "Intimação referente ao processo 9999999-88.2026.8.26.0100, parte não localizada nos processos cadastrados.",
      dataDisponibilizacao: somarDiasCorridos(hoje, -1),
      fonte: "DJEN",
      hashConteudo: "demo-publicacao-nao-identificada-1",
      status: "NAO_IDENTIFICADA",
      rawJson: { origem: "seed-demo" },
    },
  });

  console.log(`Semeados ${DEMO_ITENS.length} prazos de demonstração + 1 publicação não identificada.`);
}

// Meio-dia de São Paulo (15:00 UTC) deslocado em `offsetDias` a partir de
// hoje — as datas de visita/próximo passo do CRM são ancoradas assim para o
// dia ficar inequívoco no fuso do usuário (ver src/lib/crm/atividade.ts).
function diaRelativoSaoPaulo(offsetDias: number): Date {
  const base = new Date();
  base.setUTCDate(base.getUTCDate() + offsetDias);
  base.setUTCHours(15, 0, 0, 0);
  return base;
}

// Dados ILUSTRATIVOS do CRM comercial para exercitar o funil, o BI e a agenda
// localmente. Idempotente: só semeia se o escritório demo ainda não tiver
// nenhum lead, para não duplicar a cada `db seed`.
async function seedCrmComercial() {
  const jaTemLeads = await prisma.leadComercial.count({ where: { escritorioId: "escritorio-demo" } });
  if (jaTemLeads > 0) {
    console.log("CRM comercial: escritório demo já tem leads — pulando semeadura.");
    return;
  }

  const usuario = await prisma.usuario.findUnique({ where: { authUserId: "demo-advogado-auth-id" } });
  const responsavelId = usuario?.id ?? null;

  const motivosDescricao = [
    "Preço acima do orçamento",
    "Já usa um concorrente",
    "Sem necessidade agora",
    "Não retornou o contato",
  ];
  const motivos = await Promise.all(
    motivosDescricao.map((descricao) =>
      prisma.motivoPerdaComercial.create({ data: { escritorioId: "escritorio-demo", descricao } }),
    ),
  );
  const motivoPreco = motivos[0];
  const motivoConcorrente = motivos[1];

  // Cada lead: nicho, estágio, valores e (quando cabe) motivo de perda.
  const leadPadaria = await prisma.leadComercial.create({
    data: {
      escritorioId: "escritorio-demo",
      nomeEmpresa: "Padaria Pão Nosso",
      nicho: "Padaria",
      contatoNome: "Dona Marli",
      contatoCargo: "Proprietária",
      telefone: "+5511988887777",
      cidade: "São Paulo",
      uf: "SP",
      endereco: "Rua das Flores, 120",
      estagio: EstagioLead.EM_NEGOCIACAO,
      origem: OrigemLead.PROSPECCAO_ATIVA,
      valorPotencialCentavos: 350_000,
      responsavelId,
    },
  });

  const leadOficina = await prisma.leadComercial.create({
    data: {
      escritorioId: "escritorio-demo",
      nomeEmpresa: "Oficina TurboMax",
      nicho: "Oficina mecânica",
      contatoNome: "Seu Jorge",
      telefone: "+5511977776666",
      cidade: "Guarulhos",
      uf: "SP",
      estagio: EstagioLead.GANHO,
      origem: OrigemLead.INDICACAO,
      valorPotencialCentavos: 500_000,
      valorFechadoCentavos: 480_000,
      ganhoEm: diaRelativoSaoPaulo(-3),
      responsavelId,
    },
  });

  const leadClinica = await prisma.leadComercial.create({
    data: {
      escritorioId: "escritorio-demo",
      nomeEmpresa: "Clínica Vida Plena",
      nicho: "Clínica",
      contatoNome: "Dra. Helena",
      cidade: "Campinas",
      uf: "SP",
      estagio: EstagioLead.PERDIDO,
      origem: OrigemLead.EVENTO,
      valorPotencialCentavos: 800_000,
      perdidoEm: diaRelativoSaoPaulo(-5),
      motivoPerdaId: motivoPreco?.id ?? null,
      detalhePerda: "Achou o valor mensal alto para o momento.",
      responsavelId,
    },
  });

  await prisma.leadComercial.create({
    data: {
      escritorioId: "escritorio-demo",
      nomeEmpresa: "Mercadinho do Bairro",
      nicho: "Mercado",
      cidade: "São Paulo",
      uf: "SP",
      estagio: EstagioLead.PROSPECCAO,
      origem: OrigemLead.PROSPECCAO_ATIVA,
      valorPotencialCentavos: 250_000,
      responsavelId,
    },
  });

  await prisma.leadComercial.create({
    data: {
      escritorioId: "escritorio-demo",
      nomeEmpresa: "Barbearia Navalha de Ouro",
      nicho: "Barbearia",
      cidade: "Osasco",
      uf: "SP",
      estagio: EstagioLead.PROPOSTA_ENVIADA,
      origem: OrigemLead.REDE_SOCIAL,
      valorPotencialCentavos: 180_000,
      responsavelId,
    },
  });

  await prisma.leadComercial.create({
    data: {
      escritorioId: "escritorio-demo",
      nomeEmpresa: "Auto Peças Veloz",
      nicho: "Oficina mecânica",
      cidade: "Santo André",
      uf: "SP",
      estagio: EstagioLead.PERDIDO,
      origem: OrigemLead.SITE,
      valorPotencialCentavos: 300_000,
      perdidoEm: diaRelativoSaoPaulo(-8),
      motivoPerdaId: motivoConcorrente?.id ?? null,
      responsavelId,
    },
  });

  // Visitas — algumas nos últimos dias, para o gráfico de visitas por dia.
  await prisma.visitaComercial.createMany({
    data: [
      {
        leadId: leadPadaria.id,
        dataVisita: diaRelativoSaoPaulo(-1),
        local: "Rua das Flores, 120",
        resultado: ResultadoVisita.REALIZADA,
        anotacoes: "Gostou da demonstração, pediu proposta.",
        registradoPorId: responsavelId,
      },
      {
        leadId: leadOficina.id,
        dataVisita: diaRelativoSaoPaulo(-4),
        local: "Av. Brasil, 800",
        resultado: ResultadoVisita.REALIZADA,
        anotacoes: "Fechou na hora.",
        registradoPorId: responsavelId,
      },
      {
        leadId: leadClinica.id,
        dataVisita: diaRelativoSaoPaulo(-6),
        resultado: ResultadoVisita.REALIZADA,
        anotacoes: "Demonstração feita, ficou de pensar.",
        registradoPorId: responsavelId,
      },
      {
        leadId: leadPadaria.id,
        dataVisita: diaRelativoSaoPaulo(-1),
        resultado: ResultadoVisita.REALIZADA,
        registradoPorId: responsavelId,
      },
    ],
  });

  // Próximos passos — um vencido, um para hoje, um futuro.
  await prisma.proximoPassoComercial.createMany({
    data: [
      {
        leadId: leadPadaria.id,
        descricao: "Enviar proposta comercial revisada",
        dataPrevista: diaRelativoSaoPaulo(0),
        responsavelId,
      },
      {
        leadId: leadPadaria.id,
        descricao: "Ligar para confirmar recebimento da proposta",
        dataPrevista: diaRelativoSaoPaulo(2),
        responsavelId,
      },
      {
        leadId: leadOficina.id,
        descricao: "Agendar treinamento da equipe",
        dataPrevista: diaRelativoSaoPaulo(-1),
        responsavelId,
      },
    ],
  });

  console.log("CRM comercial: 6 leads, 4 motivos, 4 visitas e 3 próximos passos de demonstração.");
}

async function main() {
  await seedEscritorioEUsuario();
  await seedFeriadosNacionais();
  await seedTiposAtoPrazo();
  await seedDadosDemonstracaoPainel();
  await seedCrmComercial();

  // TODO(feriados estaduais/tribunal): esta seed cobre apenas o calendário
  // NACIONAL (aplicável a toda UF, tribunal = null). Feriados estaduais,
  // forais e suspensões específicas de cada tribunal (TJSP, TRF3, TRT2 etc.)
  // não são inferíveis e precisam ser cadastrados manualmente em
  // FeriadoForense com o campo `tribunal` preenchido.
  //
  // TODO(revisão de feriados): RevisaoFeriadosUf fica deliberadamente vazia
  // nesta seed. Marcar uma UF/ano como revisado é uma decisão humana ("eu
  // conferi que o calendário forense desta UF está completo para este ano"),
  // não algo que a seed pode assumir. Enquanto uma UF/ano não estiver
  // marcado aqui, o motor de prazo (Fase 3) recusa calcular e manda para
  // revisão manual com o alerta FERIADOS_NAO_REVISADOS.
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
