import "server-only";
import { prisma } from "@/lib/db";

export type OpcaoMesa = {
  id: number;
  nome: string;
  tipo: string;
  mestre: string | null;
  capacidade: number;
  /** Vagas ocupadas por outras assinaturas não canceladas (sem contar a atual). */
  ocupacaoOutras: number;
  ativo: boolean;
  /** Já vinculada à assinatura sendo editada. */
  vinculada: boolean;
};

type Atual = {
  id: number;
  planoId: number;
  plataformaId: number;
  metodoPagamentoId: number;
  mesaIds: number[];
};

/**
 * Opções para o formulário de assinatura: itens ativos, mais os que a assinatura
 * atual já usa (mesmo se inativos), e a ocupação de cada mesa.
 */
export async function carregarOpcoesAssinatura(atual?: Atual) {
  const ou = (id?: number) => (id ? [{ ativo: true }, { id }] : [{ ativo: true }]);
  const [planos, plataformas, metodos, mesas, ocupacao] = await Promise.all([
    prisma.plano.findMany({
      where: { OR: ou(atual?.planoId) },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, valorCentavos: true, periodicidade: true, limiteMesas: true, ativo: true },
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
    prisma.mesa.findMany({
      where: { OR: [{ ativo: true }, { id: { in: atual?.mesaIds ?? [] } }] },
      orderBy: [{ tipoMesa: { nome: "asc" } }, { nome: "asc" }],
      select: {
        id: true,
        nome: true,
        capacidade: true,
        ativo: true,
        tipoMesa: { select: { nome: true } },
        mestre: { select: { nome: true } },
      },
    }),
    prisma.assinaturaMesa.groupBy({
      by: ["mesaId"],
      where: {
        assinatura: { status: { not: "CANCELADO" } },
        ...(atual ? { assinaturaId: { not: atual.id } } : {}),
      },
      _count: true,
    }),
  ]);

  const ocupadas = new Map(ocupacao.map((o) => [o.mesaId, o._count]));
  const opcoesMesas: OpcaoMesa[] = mesas.map((m) => ({
    id: m.id,
    nome: m.nome,
    tipo: m.tipoMesa.nome,
    mestre: m.mestre?.nome ?? null,
    capacidade: m.capacidade,
    ocupacaoOutras: ocupadas.get(m.id) ?? 0,
    ativo: m.ativo,
    vinculada: atual?.mesaIds.includes(m.id) ?? false,
  }));

  return { planos, plataformas, metodos, mesas: opcoesMesas };
}
