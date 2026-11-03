import { notFound } from "next/navigation";
import { BotaoExcluir } from "@/components/botao-excluir";
import { Cabecalho } from "@/components/ui";
import { exigirGerente } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { paraInput } from "@/lib/format";
import { atualizarPlataforma, excluirPlataforma } from "../../_taxa/actions";
import { CONFIG_TAXA } from "../../_taxa/config";
import { TaxaForm } from "../../_taxa/form";

const c = CONFIG_TAXA.plataforma;

export default async function Page(props: PageProps<"/plataformas/[id]">) {
  await exigirGerente();
  const id = Number((await props.params).id);
  if (!Number.isSafeInteger(id)) notFound();
  const item = await prisma.plataforma.findUnique({ where: { id } });
  if (!item) notFound();

  return (
    <>
      <Cabecalho
        titulo={`Editar plataforma: ${item.nome}`}
        voltar={{ href: c.caminho, rotulo: c.plural }}
        acoes={
          <BotaoExcluir
            acao={excluirPlataforma.bind(null, item.id)}
            confirmacao={`Excluir a plataforma ${item.nome}? Esta ação não pode ser desfeita.`}
          />
        }
      />
      <TaxaForm
        acao={atualizarPlataforma.bind(null, item.id)}
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
