import "server-only";
import { prisma } from "@/lib/db";

/** Tipos de mesa e mestres para o formulário (ativos + o mestre atual, mesmo se inativo). */
export async function carregarOpcoesMesa(mestreAtualId?: number | null) {
  const [tipos, mestres] = await Promise.all([
    prisma.tipoMesa.findMany({
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, pagamentoMestre: true, valorSessaoCentavos: true, valorAlunoCentavos: true },
    }),
    prisma.mestre.findMany({
      where: { OR: mestreAtualId ? [{ ativo: true }, { id: mestreAtualId }] : [{ ativo: true }] },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, ativo: true },
    }),
  ]);
  return { tipos, mestres };
}
