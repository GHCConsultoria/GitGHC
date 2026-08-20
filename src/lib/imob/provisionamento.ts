import { PAPEIS_PADRAO } from "@/lib/imob/rbac";
import type { PrismaClient } from "../../../prisma/imob/generated";

/**
 * Cria os papéis embutidos (Administrador/Gestor/Corretor/Financeiro/
 * Assistente) para uma imobiliária recém-criada e devolve o papel
 * Administrador — usado tanto no cadastro self-service (acoes.ts) quanto no
 * seed. Reaproveita o catálogo de rbac.ts, então nunca fica dessincronizado.
 *
 * Aceita tanto o client normal quanto um client transacional (o tipo é o
 * mesmo em ambos no Prisma), garantindo que tenant + papéis + admin nasçam
 * numa transação só.
 */
export async function provisionarPapeisPadrao(client: Pick<PrismaClient, "papel">, imobiliariaId: string) {
  const criados = await Promise.all(
    PAPEIS_PADRAO.map((p) =>
      client.papel.create({
        data: {
          imobiliariaId,
          nome: p.nome,
          descricao: p.descricao,
          sistema: true,
          permissoes: p.permissoes,
        },
      }),
    ),
  );

  const admin = criados.find((p) => p.nome === "Administrador");
  if (!admin) {
    throw new Error("papel Administrador nao foi criado — catalogo PAPEIS_PADRAO inconsistente");
  }
  return { papeis: criados, admin };
}
