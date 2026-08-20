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
 * Os dados comerciais volumosos (imóveis, leads, propostas, ...) serão
 * semeados nas fases em que esses modelos existirem — aqui, Fase 1, semeamos
 * só a conta: tenant, papéis e equipe.
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
