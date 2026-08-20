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
 * Além da conta (tenant, papéis, equipe), semeia os cadastros comerciais da
 * Fase 2: 15 proprietários, 20 clientes e 30 imóveis fictícios. Leads,
 * propostas, vendas etc. entram nas fases em que esses modelos existirem.
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
