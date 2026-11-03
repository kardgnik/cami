import { notFound } from "next/navigation";
import { BotaoExcluir } from "@/components/botao-excluir";
import { Cabecalho } from "@/components/ui";
import { exigirGerente } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { paraInput } from "@/lib/format";
import { atualizarTipoMesa, excluirTipoMesa } from "../actions";
import { TipoMesaForm } from "../form";

export default async function Page(props: PageProps<"/tipos-mesa/[id]">) {
  await exigirGerente();
  const id = Number((await props.params).id);
  if (!Number.isSafeInteger(id)) notFound();
  const tipo = await prisma.tipoMesa.findUnique({ where: { id } });
  if (!tipo) notFound();
  return (
    <>
      <Cabecalho
        titulo={`Editar tipo: ${tipo.nome}`}
        descricao="Mudar o valor afeta só as sessões registradas daqui em diante."
        voltar={{ href: "/tipos-mesa", rotulo: "Tipos de mesa" }}
        acoes={
          <BotaoExcluir
            acao={excluirTipoMesa.bind(null, tipo.id)}
            confirmacao={`Excluir o tipo de mesa ${tipo.nome}? Esta ação não pode ser desfeita.`}
          />
        }
      />
      <TipoMesaForm
        acao={atualizarTipoMesa.bind(null, tipo.id)}
        inicial={{ nome: tipo.nome, valorSessaoCentavos: paraInput(tipo.valorSessaoCentavos) }}
      />
    </>
  );
}
