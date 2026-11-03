import { notFound } from "next/navigation";
import { Cabecalho } from "@/components/ui";
import { exigirGerente } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { paraInput } from "@/lib/format";
import { atualizarMetodo } from "../../_taxa/actions";
import { CONFIG_TAXA } from "../../_taxa/config";
import { TaxaForm } from "../../_taxa/form";

const c = CONFIG_TAXA.metodoPagamento;

export default async function Page(props: PageProps<"/metodos-pagamento/[id]">) {
  await exigirGerente();
  const id = Number((await props.params).id);
  if (!Number.isSafeInteger(id)) notFound();
  const item = await prisma.metodoPagamento.findUnique({ where: { id } });
  if (!item) notFound();

  return (
    <>
      <Cabecalho titulo={`Editar método: ${item.nome}`} voltar={{ href: c.caminho, rotulo: c.plural }} />
      <TaxaForm
        acao={atualizarMetodo.bind(null, item.id)}
        voltarPara={c.caminho}
        inicial={{
          nome: item.nome,
          taxaPercentualBp: paraInput(item.taxaPercentualBp),
          taxaFixaCentavos: paraInput(item.taxaFixaCentavos),
        }}
      />
    </>
  );
}
