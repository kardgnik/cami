import "server-only";
import { prisma } from "./db";

/** Ocupação de uma mesa e se ela está fechada por um grupo. */
export type SituacaoMesa = {
  /** Vínculos com assinaturas que não estão canceladas. */
  ocupacao: number;
  /** Alguma dessas assinaturas é de um plano de grupo fechado: a mesa não tem vagas. */
  fechada: boolean;
};

const VAZIA: SituacaoMesa = { ocupacao: 0, fechada: false };

/**
 * Situação das mesas: só ocupa vaga (e só fecha a mesa) a assinatura que não está
 * cancelada. `excetoAssinaturaId` desconsidera a assinatura que está sendo editada.
 */
export async function situacaoDasMesas(opcoes: { mesaIds?: number[]; excetoAssinaturaId?: number } = {}) {
  const vinculos = await prisma.assinaturaMesa.findMany({
    where: {
      assinatura: { status: { not: "CANCELADO" } },
      ...(opcoes.mesaIds ? { mesaId: { in: opcoes.mesaIds } } : {}),
      ...(opcoes.excetoAssinaturaId ? { assinaturaId: { not: opcoes.excetoAssinaturaId } } : {}),
    },
    select: { mesaId: true, assinatura: { select: { plano: { select: { grupoFechado: true } } } } },
  });
  const mapa = new Map<number, SituacaoMesa>();
  for (const v of vinculos) {
    const s = mapa.get(v.mesaId) ?? { ocupacao: 0, fechada: false };
    s.ocupacao += 1;
    if (v.assinatura.plano.grupoFechado) s.fechada = true;
    mapa.set(v.mesaId, s);
  }
  return { de: (mesaId: number): SituacaoMesa => mapa.get(mesaId) ?? VAZIA };
}
