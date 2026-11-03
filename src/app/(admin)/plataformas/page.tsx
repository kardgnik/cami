import { exigirGerente } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { alternarPlataforma } from "../_taxa/actions";
import { ListaTaxa } from "../_taxa/lista";

export const metadata = { title: "Plataformas · Gestão de Assinaturas" };

export default async function Page() {
  await exigirGerente();
  const linhas = await prisma.plataforma.findMany({
    orderBy: [{ ativo: "desc" }, { nome: "asc" }],
    include: { _count: { select: { assinantes: true } } },
  });
  return <ListaTaxa tipo="plataforma" linhas={linhas} alternar={alternarPlataforma} />;
}
