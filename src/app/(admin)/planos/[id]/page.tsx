import { notFound } from "next/navigation";
import { Cabecalho } from "@/components/ui";
import { exigirGerente } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { paraInput } from "@/lib/format";
import { atualizarPlano } from "../actions";
import { PlanoForm } from "../form";

export default async function Page(props: PageProps<"/planos/[id]">) {
  await exigirGerente();
  const id = Number((await props.params).id);
  if (!Number.isSafeInteger(id)) notFound();
  const plano = await prisma.plano.findUnique({ where: { id } });
  if (!plano) notFound();
  return (
    <>
      <Cabecalho titulo={`Editar plano: ${plano.nome}`} voltar={{ href: "/planos", rotulo: "Planos" }} />
      <PlanoForm
        acao={atualizarPlano.bind(null, plano.id)}
        inicial={{
          nome: plano.nome,
          descricao: plano.descricao ?? "",
          valorCentavos: paraInput(plano.valorCentavos),
          periodicidade: plano.periodicidade,
        }}
      />
    </>
  );
}
