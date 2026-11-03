import "server-only";
import { prisma } from "@/lib/db";

/** Opções ativas para os selects, mais as que o assinante já usa (mesmo se inativas). */
export async function carregarOpcoes(atual?: { planoId: number; plataformaId: number; metodoPagamentoId: number }) {
  const ou = (id?: number) => (id ? [{ ativo: true }, { id }] : [{ ativo: true }]);
  const [planos, plataformas, metodos] = await Promise.all([
    prisma.plano.findMany({
      where: { OR: ou(atual?.planoId) },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, valorCentavos: true, periodicidade: true, ativo: true },
    }),
    prisma.plataforma.findMany({
      where: { OR: ou(atual?.plataformaId) },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, taxaPercentualBp: true, taxaFixaCentavos: true, ativo: true },
    }),
    prisma.metodoPagamento.findMany({
      where: { OR: ou(atual?.metodoPagamentoId) },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, taxaPercentualBp: true, taxaFixaCentavos: true, ativo: true },
    }),
  ]);
  return { planos, plataformas, metodos };
}
