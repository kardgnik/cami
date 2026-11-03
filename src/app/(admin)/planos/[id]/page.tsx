import { notFound } from "next/navigation";
import { BotaoExcluir } from "@/components/botao-excluir";
import { Cabecalho } from "@/components/ui";
import { exigirGerente } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { paraInput } from "@/lib/format";
import { atualizarPlano, excluirPlano } from "../actions";
import { PlanoForm } from "../form";

export default async function Page(props: PageProps<"/planos/[id]">) {
  await exigirGerente();
  const id = Number((await props.params).id);
  if (!Number.isSafeInteger(id)) notFound();
  const plano = await prisma.plano.findUnique({ where: { id } });
  if (!plano) notFound();
  return (
    <>
      <Cabecalho
        titulo={`Editar plano: ${plano.nome}`}
        voltar={{ href: "/planos", rotulo: "Planos" }}
        acoes={
          <BotaoExcluir
            acao={excluirPlano.bind(null, plano.id)}
            confirmacao={`Excluir o plano ${plano.nome}? Esta ação não pode ser desfeita.`}
          />
        }
      />
      <PlanoForm
        acao={atualizarPlano.bind(null, plano.id)}
        inicial={{
          nome: plano.nome,
          descricao: plano.descricao ?? "",
          valorCentavos: paraInput(plano.valorCentavos),
          periodicidade: plano.periodicidade,
          limiteMesas: String(plano.limiteMesas),
        }}
      />
    </>
  );
}
