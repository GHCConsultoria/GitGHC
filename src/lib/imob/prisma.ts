import { PrismaClient } from "../../../prisma/imob/generated";

/**
 * Client Prisma do produto imobiliário (vertical "imob") — banco Postgres
 * próprio (IMOB_DATABASE_URL), separado do Postgres do Zelo (src/lib/prisma.ts)
 * e do Turso do NoSheipe (src/lib/nutri/prisma.ts). Singleton em dev pra não
 * estourar conexões no hot-reload, mesmo padrão dos outros clients.
 */
const globalForPrismaImob = globalThis as unknown as { prismaImob?: PrismaClient };

export const prismaImob = globalForPrismaImob.prismaImob ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrismaImob.prismaImob = prismaImob;
}
