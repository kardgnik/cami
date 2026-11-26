import "server-only";
import { prisma } from "@/lib/db";

/** Tipos de mesa e mestres para o formulário (ativos + o mestre atual, mesmo se inativo). */
export async function carregarOpcoesMesa(mestresAtuais: (number | null)[] = []) {
  const atuais = mestresAtuais.filter((id): id is number => id !== null);
  const [tipos, mestres] = await Promise.all([
    prisma.tipoMesa.findMany({
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, pagamentoMestre: true, valorSessaoCentavos: true, valorAlunoCentavos: true },
    }),
    prisma.mestre.findMany({
      where: { OR: [{ ativo: true }, { id: { in: atuais } }] },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, ativo: true },
    }),
  ]);
  return { tipos, mestres };
}
