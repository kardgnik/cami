import { exigirGerente } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { alternarMetodo } from "../_taxa/actions";
import { ListaTaxa } from "../_taxa/lista";

export const metadata = { title: "Métodos de pagamento · Gestão de Assinaturas" };

export default async function Page() {
  await exigirGerente();
  const linhas = await prisma.metodoPagamento.findMany({
    orderBy: [{ ativo: "desc" }, { nome: "asc" }],
    include: { _count: { select: { assinantes: true } } },
  });
  return <ListaTaxa tipo="metodoPagamento" linhas={linhas} alternar={alternarMetodo} />;
}
