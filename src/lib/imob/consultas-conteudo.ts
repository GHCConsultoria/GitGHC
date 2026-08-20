import { prismaImob } from "@/lib/imob/prisma";
import { mapaClientes, mapaImoveis, mapaProprietarios } from "@/lib/imob/resolvedores";

/** Consultas da central de documentos (Fase 6) — filtradas por tenant. */

export async function listarDocumentos(imobiliariaId: string, tipo?: string) {
  const docs = await prismaImob.documento.findMany({
    where: { imobiliariaId, ...(tipo ? { tipo: tipo as never } : {}) },
    orderBy: { criadoEm: "desc" },
    take: 300,
  });
  const imoveis = await mapaImoveis(
    imobiliariaId,
    docs.map((d) => d.imovelId),
  );
  const clientes = await mapaClientes(
    imobiliariaId,
    docs.map((d) => d.clienteId),
  );
  const props = await mapaProprietarios(
    imobiliariaId,
    docs.map((d) => d.proprietarioId),
  );
  return docs.map((d) => {
    const vinculo =
      (d.clienteId && clientes.get(d.clienteId)) ||
      (d.proprietarioId && props.get(d.proprietarioId)) ||
      (d.imovelId && imoveis.get(d.imovelId)?.codigo) ||
      null;
    return { ...d, vinculoNome: vinculo };
  });
}

export async function obterDocumentoDoTenant(imobiliariaId: string, id: string) {
  const d = await prismaImob.documento.findUnique({ where: { id } });
  if (!d || d.imobiliariaId !== imobiliariaId) return null;
  return d;
}
