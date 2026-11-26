import "server-only";
import { prisma } from "@/lib/db";
import type { DiaSemana } from "@/lib/labels";
import { nomesDosMestres, situacaoDasMesas } from "@/lib/mesas";

export type OpcaoMesa = {
  id: number;
  nome: string;
  tipo: string;
  mestre: string | null;
  diaSemana: DiaSemana | null;
  capacidade: number;
  /** Vagas ocupadas por outras assinaturas não canceladas (sem contar a atual). */
  ocupacaoOutras: number;
  /** Outra assinatura (não cancelada) de plano de grupo fechado já está nesta mesa. */
  fechadaPorOutra: boolean;
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
  const [planos, plataformas, metodos, mesas, situacao] = await Promise.all([
    prisma.plano.findMany({
      where: { OR: ou(atual?.planoId) },
      orderBy: { nome: "asc" },
      select: {
        id: true,
        nome: true,
        valorCentavos: true,
        periodicidade: true,
        limiteMesas: true,
        grupoFechado: true,
        ativo: true,
      },
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
        diaSemana: true,
        ativo: true,
        tipoMesa: { select: { nome: true } },
        mestre: { select: { nome: true } },
        mestre2: { select: { nome: true } },
      },
    }),
    situacaoDasMesas({ excetoAssinaturaId: atual?.id }),
  ]);

  const opcoesMesas: OpcaoMesa[] = mesas.map((m) => ({
    id: m.id,
    nome: m.nome,
    tipo: m.tipoMesa.nome,
    mestre: nomesDosMestres(m),
    diaSemana: m.diaSemana,
    capacidade: m.capacidade,
    ocupacaoOutras: situacao.de(m.id).ocupacao,
    fechadaPorOutra: situacao.de(m.id).fechada,
    ativo: m.ativo,
    vinculada: atual?.mesaIds.includes(m.id) ?? false,
  }));

  return { planos, plataformas, metodos, mesas: opcoesMesas };
}
