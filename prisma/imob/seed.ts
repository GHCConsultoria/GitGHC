import { PAPEIS_PADRAO } from "../../src/lib/imob/rbac";
import { PrismaClient } from "./generated";

const prisma = new PrismaClient();

// ids fixos → seed idempotente (rodar de novo não duplica).
const IMOBILIARIA_DEMO_ID = "demo-imobiliaria";
const AUTH_USER_ID_DEMO = "demo-imob-admin-auth-id";

/**
 * Semeia uma imobiliária demo + papéis padrão + usuários de exemplo. O admin
 * demo (AUTH_USER_ID_DEMO) é o que src/lib/imob/auth.ts resolve quando o
 * Supabase não está configurado — permite navegar /imob localmente sem
 * credenciais reais, igual ao advogado/nutricionista demo dos outros produtos.
 *
 * Além da conta (tenant, papéis, equipe), semeia os cadastros da Fase 2 (15
 * proprietários, 20 clientes, 30 imóveis), o CRM da Fase 3 (4 corretores, 20
 * leads, 10 visitas, 10 tarefas, 6 captações) e o comercial da Fase 4 (10
 * propostas, 8 vendas, 8 locações, 8 contratos — alguns vencendo, para popular
 * os alertas). Comissões/financeiro detalhado entram nas fases seguintes.
 */
async function main() {
  const imobiliaria = await prisma.imobiliaria.upsert({
    where: { id: IMOBILIARIA_DEMO_ID },
    update: {},
    create: {
      id: IMOBILIARIA_DEMO_ID,
      nome: "Imobiliária Demonstração",
      cnpj: "12.345.678/0001-90",
      creci: "J-12345",
      email: "contato@imobiliariademo.com.br",
      telefone: "(11) 3000-0000",
      cidade: "São Paulo",
      estado: "SP",
      onboardingConcluido: true,
    },
  });

  // Papéis padrão (idempotente por [imobiliariaId, nome]).
  const papeisPorNome = new Map<string, string>();
  for (const p of PAPEIS_PADRAO) {
    const papel = await prisma.papel.upsert({
      where: { imobiliariaId_nome: { imobiliariaId: imobiliaria.id, nome: p.nome } },
      update: { permissoes: p.permissoes, descricao: p.descricao, sistema: true },
      create: {
        imobiliariaId: imobiliaria.id,
        nome: p.nome,
        descricao: p.descricao,
        sistema: true,
        permissoes: p.permissoes,
      },
    });
    papeisPorNome.set(p.nome, papel.id);
  }

  // Equipe demo. Só o admin tem authUserId "demo" (usado no fallback sem
  // Supabase); os demais existem para popular a listagem de usuários.
  const equipe: Array<{ authUserId: string; nome: string; email: string; papel: string }> = [
    {
      authUserId: AUTH_USER_ID_DEMO,
      nome: "Ana Administradora",
      email: "admin@imobiliariademo.com.br",
      papel: "Administrador",
    },
    { authUserId: "demo-imob-gestor", nome: "Gustavo Gestor", email: "gestor@imobiliariademo.com.br", papel: "Gestor" },
    {
      authUserId: "demo-imob-corretor",
      nome: "Carla Corretora",
      email: "corretor@imobiliariademo.com.br",
      papel: "Corretor",
    },
    {
      authUserId: "demo-imob-financeiro",
      nome: "Felipe Financeiro",
      email: "financeiro@imobiliariademo.com.br",
      papel: "Financeiro",
    },
  ];

  for (const membro of equipe) {
    const papelId = papeisPorNome.get(membro.papel);
    if (!papelId) throw new Error(`papel ${membro.papel} nao semeado`);
    await prisma.usuarioImob.upsert({
      where: { authUserId: membro.authUserId },
      update: { nome: membro.nome, papelId },
      create: {
        authUserId: membro.authUserId,
        nome: membro.nome,
        email: membro.email,
        papelId,
        imobiliariaId: imobiliaria.id,
      },
    });
  }

  await seedCadastrosDemo(imobiliaria.id);
  await seedCrmDemo(imobiliaria.id);
  await seedFinanceiroDemo(imobiliaria.id);
}

// --- Propostas / Vendas / Locações / Contratos (Fase 4) -------------------

const STATUS_PROPOSTA = ["RASCUNHO", "ENVIADA", "EM_ANALISE", "ACEITA", "RECUSADA"] as const;
const TIPOS_CONTRATO = ["ADMINISTRACAO", "LOCACAO", "COMPRA_VENDA", "CAPTACAO", "PRESTACAO_SERVICOS"] as const;

async function seedFinanceiroDemo(imobiliariaId: string) {
  const imoveis = await prisma.imovel.findMany({
    where: { imobiliariaId },
    select: { id: true },
    orderBy: { codigo: "asc" },
  });
  const clientes = await prisma.cliente.findMany({ where: { imobiliariaId }, select: { id: true } });
  const proprietarios = await prisma.proprietario.findMany({ where: { imobiliariaId }, select: { id: true } });
  const corretores = await prisma.corretor.findMany({ where: { imobiliariaId }, select: { id: true } });
  const imovelIds = imoveis.map((i) => i.id);
  const clienteIds = clientes.map((c) => c.id);
  const proprietarioIds = proprietarios.map((p) => p.id);
  const corretorIds = corretores.map((c) => c.id);
  if (imovelIds.length === 0) return;

  const pick = <T>(arr: T[], i: number): T | null => (arr.length ? arr[i % arr.length] : null);

  // 10 propostas
  for (let i = 0; i < 10; i++) {
    const id = `demo-prop4-${i + 1}`;
    await prisma.proposta.upsert({
      where: { id },
      update: {},
      create: {
        id,
        imobiliariaId,
        imovelId: imovelIds[i % imovelIds.length],
        clienteId: pick(clienteIds, i),
        corretorId: pick(corretorIds, i),
        valorProposto: 28000000 + i * 3000000,
        valorSolicitado: 30000000 + i * 3000000,
        entrada: 5000000,
        financiamento: i % 2 === 0,
        status: STATUS_PROPOSTA[i % STATUS_PROPOSTA.length],
        historico: {
          create: [{ statusNovo: STATUS_PROPOSTA[i % STATUS_PROPOSTA.length], observacao: "Proposta demo" }],
        },
      },
    });
  }

  // 8 vendas
  for (let i = 0; i < 8; i++) {
    const id = `demo-venda-${i + 1}`;
    await prisma.venda.upsert({
      where: { id },
      update: {},
      create: {
        id,
        imobiliariaId,
        imovelId: imovelIds[i % imovelIds.length],
        clienteId: pick(clienteIds, i),
        proprietarioId: pick(proprietarioIds, i),
        corretorId: pick(corretorIds, i),
        valorVenda: 35000000 + i * 5000000,
        comissaoValor: 2100000 + i * 300000,
        data: new Date(Date.now() - i * 3 * 86400000),
        financiamento: i % 2 === 0,
      },
    });
  }

  // 8 locações
  for (let i = 0; i < 8; i++) {
    const id = `demo-loc-${i + 1}`;
    await prisma.locacao.upsert({
      where: { id },
      update: {},
      create: {
        id,
        imobiliariaId,
        imovelId: imovelIds[(i + 5) % imovelIds.length],
        proprietarioId: pick(proprietarioIds, i),
        locatarioId: pick(clienteIds, i),
        corretorId: pick(corretorIds, i),
        valorAluguel: 180000 + i * 20000,
        condominio: 45000,
        iptu: 12000,
        caucao: 540000,
        dataInicial: new Date(Date.now() - 30 * 86400000),
        dataFinal: new Date(Date.now() + 335 * 86400000),
        diaVencimento: 5 + (i % 20),
        indiceReajuste: i % 2 === 0 ? "IGPM" : "IPCA",
        status: i % 5 === 0 ? "INADIMPLENTE" : "ATIVO",
      },
    });
  }

  // 8 contratos — alguns vencendo em breve, para popular os alertas
  const vencimentos = [5, 12, 25, 60, 120, -3, 200, 15]; // dias a partir de hoje
  for (let i = 0; i < 8; i++) {
    const id = `demo-contrato-${i + 1}`;
    await prisma.contrato.upsert({
      where: { id },
      update: {},
      create: {
        id,
        imobiliariaId,
        titulo: `Contrato ${i + 1}`,
        tipo: TIPOS_CONTRATO[i % TIPOS_CONTRATO.length],
        imovelId: imovelIds[i % imovelIds.length],
        clienteId: pick(clienteIds, i),
        proprietarioId: pick(proprietarioIds, i),
        dataInicio: new Date(Date.now() - 200 * 86400000),
        dataFim: new Date(Date.now() + vencimentos[i] * 86400000),
        status: "ATIVO",
      },
    });
  }
}

// --- Dados comerciais de demonstração (Fase 2) ----------------------------
// Ids determinísticos (demo-*) → idempotente. Dados fictícios realistas.

const NOMES = [
  "Ana Souza",
  "Bruno Lima",
  "Carla Dias",
  "Diego Rocha",
  "Elaine Costa",
  "Fábio Nunes",
  "Gabriela Alves",
  "Henrique Melo",
  "Isabela Pinto",
  "João Ramos",
  "Karina Teixeira",
  "Lucas Farias",
  "Mariana Gomes",
  "Nelson Barros",
  "Olívia Cardoso",
  "Paulo Freitas",
  "Queila Moraes",
  "Rafael Prado",
  "Sônia Ribeiro",
  "Tiago Vasconcelos",
];
const CIDADES = [
  ["São Paulo", "SP"],
  ["Campinas", "SP"],
  ["Rio de Janeiro", "RJ"],
  ["Belo Horizonte", "MG"],
  ["Curitiba", "PR"],
  ["Porto Alegre", "RS"],
] as const;
const BAIRROS = ["Centro", "Jardins", "Vila Nova", "Boa Vista", "Alto da Serra", "Bela Vista"];
const TIPOS = ["CASA", "APARTAMENTO", "TERRENO", "SALA_COMERCIAL", "LOJA", "GALPAO"] as const;
const FINALIDADES = ["VENDA", "LOCACAO", "VENDA_LOCACAO"] as const;
const STATUS = ["DISPONIVEL", "DISPONIVEL", "DISPONIVEL", "RESERVADO", "EM_NEGOCIACAO", "VENDIDO", "ALUGADO"] as const;
const TIPOS_CLIENTE = ["COMPRADOR", "LOCATARIO", "INVESTIDOR", "INTERESSADO"] as const;

async function seedCadastrosDemo(imobiliariaId: string) {
  // 15 proprietários
  const proprietarioIds: string[] = [];
  for (let i = 0; i < 15; i++) {
    const id = `demo-prop-${i + 1}`;
    proprietarioIds.push(id);
    const nome = NOMES[i % NOMES.length];
    await prisma.proprietario.upsert({
      where: { id },
      update: {},
      create: {
        id,
        imobiliariaId,
        nome,
        tipoPessoa: i % 5 === 0 ? "JURIDICA" : "FISICA",
        documento: `${10000000000 + i}`,
        email: `prop${i + 1}@exemplo.com.br`,
        telefone: `(11) 9${String(80000000 + i).padStart(8, "0")}`,
      },
    });
  }

  // 20 clientes
  for (let i = 0; i < 20; i++) {
    const id = `demo-cli-${i + 1}`;
    const [cidade] = CIDADES[i % CIDADES.length];
    await prisma.cliente.upsert({
      where: { id },
      update: {},
      create: {
        id,
        imobiliariaId,
        nome: NOMES[i % NOMES.length],
        tipo: TIPOS_CLIENTE[i % TIPOS_CLIENTE.length],
        documento: `${20000000000 + i}`,
        email: `cliente${i + 1}@exemplo.com.br`,
        telefone: `(11) 9${String(70000000 + i).padStart(8, "0")}`,
        prefTipoImovel: TIPOS[i % TIPOS.length],
        prefFinalidade: FINALIDADES[i % FINALIDADES.length],
        prefValorMin: 20000000 + i * 1000000,
        prefValorMax: 80000000 + i * 2000000,
        prefCidade: cidade,
        prefQuartos: (i % 4) + 1,
      },
    });
  }

  // 30 imóveis
  for (let i = 0; i < 30; i++) {
    const codigo = `IMOB-${String(i + 1).padStart(3, "0")}`;
    const tipo = TIPOS[i % TIPOS.length];
    const finalidade = FINALIDADES[i % FINALIDADES.length];
    const status = STATUS[i % STATUS.length];
    const [cidade, uf] = CIDADES[i % CIDADES.length];
    const quartos = tipo === "TERRENO" || tipo === "GALPAO" ? null : (i % 4) + 1;
    const precoVenda = finalidade === "LOCACAO" ? null : 30000000 + i * 3500000;
    const precoAluguel = finalidade === "VENDA" ? null : 150000 + i * 25000;

    await prisma.imovel.upsert({
      where: { imobiliariaId_codigo: { imobiliariaId, codigo } },
      update: {},
      create: {
        imobiliariaId,
        codigo,
        titulo: `${tipoLegivel(tipo)} em ${BAIRROS[i % BAIRROS.length]}`,
        descricao: "Imóvel de demonstração com dados fictícios para o ambiente de testes.",
        tipo,
        finalidade,
        status,
        precoVenda,
        precoAluguel,
        condominio: tipo === "APARTAMENTO" ? 45000 + i * 1000 : null,
        iptu: 12000 + i * 500,
        areaTotal: 60 + i * 5,
        areaConstruida: tipo === "TERRENO" ? null : 50 + i * 4,
        quartos,
        suites: quartos ? Math.max(0, quartos - 2) : null,
        banheiros: quartos ? quartos : null,
        vagas: (i % 3) + 1,
        aceitaFinanciamento: i % 2 === 0,
        mobiliado: i % 3 === 0,
        caracteristicas: i % 2 === 0 ? ["portaria 24h", "área de lazer"] : ["quintal"],
        bairro: BAIRROS[i % BAIRROS.length],
        cidade,
        estado: uf,
        proprietarios: {
          create: [{ proprietarioId: proprietarioIds[i % proprietarioIds.length] }],
        },
      },
    });
  }
}

function tipoLegivel(tipo: string): string {
  const mapa: Record<string, string> = {
    CASA: "Casa",
    APARTAMENTO: "Apartamento",
    TERRENO: "Terreno",
    SALA_COMERCIAL: "Sala comercial",
    LOJA: "Loja",
    GALPAO: "Galpão",
  };
  return mapa[tipo] ?? tipo;
}

main()
  .then(() => console.log("Imobiliária demo semeada no Postgres."))
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

// --- CRM de demonstração (Fase 3) -----------------------------------------

const ETAPAS = [
  "NOVO",
  "CONTATO_REALIZADO",
  "QUALIFICACAO",
  "VISITA_AGENDADA",
  "VISITA_REALIZADA",
  "PROPOSTA",
  "NEGOCIACAO",
  "FECHADO",
  "PERDIDO",
] as const;
const ORIGENS = ["SITE", "INSTAGRAM", "WHATSAPP", "PORTAL", "INDICACAO", "GOOGLE"] as const;
const STATUS_VISITA = ["AGENDADA", "CONFIRMADA", "REALIZADA", "CANCELADA"] as const;
const PRIORIDADES = ["BAIXA", "MEDIA", "ALTA", "URGENTE"] as const;

async function seedCrmDemo(imobiliariaId: string) {
  // 4 corretores
  const corretorIds: string[] = [];
  const nomesCorretor = ["Rafael Vendas", "Beatriz Imóveis", "Marcos Negócios", "Larissa Silva"];
  for (let i = 0; i < nomesCorretor.length; i++) {
    const id = `demo-corr-${i + 1}`;
    corretorIds.push(id);
    await prisma.corretor.upsert({
      where: { id },
      update: {},
      create: {
        id,
        imobiliariaId,
        nome: nomesCorretor[i],
        creci: `F-${20000 + i}`,
        email: `corretor${i + 1}@imobiliariademo.com.br`,
        telefone: `(11) 9${String(60000000 + i).padStart(8, "0")}`,
        ativo: true,
        metaMensal: 5000000 + i * 1000000,
        percentualComissao: 5 + i,
      },
    });
  }

  const imoveis = await prisma.imovel.findMany({
    where: { imobiliariaId },
    select: { id: true },
    orderBy: { codigo: "asc" },
  });
  const clientes = await prisma.cliente.findMany({
    where: { imobiliariaId },
    select: { id: true },
    orderBy: { criadoEm: "asc" },
  });
  const imovelIds = imoveis.map((i) => i.id);
  const clienteIds = clientes.map((c) => c.id);
  const proprietarios = await prisma.proprietario.findMany({ where: { imobiliariaId }, select: { id: true } });
  const proprietarioIds = proprietarios.map((p) => p.id);

  // 20 leads distribuídos pelas etapas
  for (let i = 0; i < 20; i++) {
    const id = `demo-lead-${i + 1}`;
    await prisma.lead.upsert({
      where: { id },
      update: {},
      create: {
        id,
        imobiliariaId,
        nome: `${NOMES[i % NOMES.length]} (lead)`,
        telefone: `(11) 9${String(50000000 + i).padStart(8, "0")}`,
        origem: ORIGENS[i % ORIGENS.length],
        etapa: ETAPAS[i % ETAPAS.length],
        valorPretendido: 25000000 + i * 2000000,
        corretorId: corretorIds[i % corretorIds.length],
        imovelId: imovelIds.length ? imovelIds[i % imovelIds.length] : null,
        clienteId: clienteIds.length ? clienteIds[i % clienteIds.length] : null,
        proximaAcao: new Date(Date.now() + (i % 10) * 86400000),
      },
    });
  }

  // 10 visitas
  for (let i = 0; i < 10 && imovelIds.length > 0; i++) {
    const id = `demo-visita-${i + 1}`;
    await prisma.visita.upsert({
      where: { id },
      update: {},
      create: {
        id,
        imobiliariaId,
        imovelId: imovelIds[i % imovelIds.length],
        clienteId: clienteIds.length ? clienteIds[i % clienteIds.length] : null,
        corretorId: corretorIds[i % corretorIds.length],
        data: new Date(Date.now() + (i - 3) * 86400000),
        duracaoMin: 30 + (i % 3) * 15,
        status: STATUS_VISITA[i % STATUS_VISITA.length],
      },
    });
  }

  // 10 tarefas
  for (let i = 0; i < 10; i++) {
    const id = `demo-tarefa-${i + 1}`;
    await prisma.tarefa.upsert({
      where: { id },
      update: {},
      create: {
        id,
        imobiliariaId,
        titulo: `Tarefa de exemplo ${i + 1}`,
        descricao: "Item de demonstração do módulo de tarefas.",
        prioridade: PRIORIDADES[i % PRIORIDADES.length],
        prazo: new Date(Date.now() + (i % 7) * 86400000),
        status: i % 4 === 0 ? "CONCLUIDA" : "PENDENTE",
        concluidoEm: i % 4 === 0 ? new Date() : null,
        clienteId: clienteIds.length ? clienteIds[i % clienteIds.length] : null,
      },
    });
  }

  // 6 captações
  const statusCaptacao = [
    "PROSPECTADO",
    "CONTATO_REALIZADO",
    "DOCUMENTACAO",
    "CONTRATO",
    "ATIVO",
    "ENCERRADO",
  ] as const;
  for (let i = 0; i < 6 && imovelIds.length > 0; i++) {
    const id = `demo-capt-${i + 1}`;
    await prisma.captacao.upsert({
      where: { id },
      update: {},
      create: {
        id,
        imobiliariaId,
        proprietarioId: proprietarioIds.length ? proprietarioIds[i % proprietarioIds.length] : null,
        imovelId: imovelIds[i % imovelIds.length],
        corretorId: corretorIds[i % corretorIds.length],
        dataCaptacao: new Date(Date.now() - i * 86400000),
        exclusividade: i % 2 === 0,
        comissaoPercentual: 5 + (i % 3),
        status: statusCaptacao[i % statusCaptacao.length],
      },
    });
  }
}
