import "server-only";
import { prisma } from "@/lib/db";

/** Tipos de mesa e mestres para o formulário (ativos + o mestre atual, mesmo se inativo). */
export async function carregarOpcoesMesa(mestreAtualId?: number | null) {
  const [tipos, mestres] = await Promise.all([
    prisma.tipoMesa.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true, valorSessaoCentavos: true } }),
    prisma.mestre.findMany({
      where: { OR: mestreAtualId ? [{ ativo: true }, { id: mestreAtualId }] : [{ ativo: true }] },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, ativo: true },
    }),
  ]);
  return { tipos, mestres };
}

/** Ocupação por mesa: vínculos com assinaturas que não estão canceladas. */
export async function ocupacaoPorMesa(mesaIds?: number[]) {
  const grupos = await prisma.assinaturaMesa.groupBy({
    by: ["mesaId"],
    where: {
      assinatura: { status: { not: "CANCELADO" } },
      ...(mesaIds ? { mesaId: { in: mesaIds } } : {}),
    },
    _count: true,
  });
  return new Map(grupos.map((g) => [g.mesaId, g._count]));
}
