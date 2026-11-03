import { notFound } from "next/navigation";
import { BotaoConfirmar } from "@/components/botao-confirmar";
import { Cabecalho } from "@/components/ui";
import { exigirGerente } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { paraInputData } from "@/lib/format";
import { atualizarAssinante, excluirAssinante } from "../actions";
import { AssinanteForm } from "../form";
import { carregarOpcoes } from "../opcoes";

export default async function Page(props: PageProps<"/assinantes/[id]">) {
  await exigirGerente();
  const id = Number((await props.params).id);
  if (!Number.isSafeInteger(id)) notFound();
  const a = await prisma.assinante.findUnique({ where: { id } });
  if (!a) notFound();
  const opcoes = await carregarOpcoes(a);

  return (
    <>
      <Cabecalho
        titulo={a.nome}
        descricao={a.email}
        voltar={{ href: "/assinantes", rotulo: "Assinantes" }}
        acoes={
          <form action={excluirAssinante.bind(null, a.id)}>
            <BotaoConfirmar
              className="btn-perigo"
              confirmacao={`Excluir ${a.nome}? Esta ação não pode ser desfeita. Para manter o histórico, prefira marcar como cancelado.`}
            >
              Excluir
            </BotaoConfirmar>
          </form>
        }
      />
      <AssinanteForm
        acao={atualizarAssinante.bind(null, a.id)}
        {...opcoes}
        inicial={{
          nome: a.nome,
          email: a.email,
          telefone: a.telefone ?? "",
          status: a.status,
          dataInicio: paraInputData(a.dataInicio),
          observacoes: a.observacoes ?? "",
          planoId: String(a.planoId),
          plataformaId: String(a.plataformaId),
          metodoPagamentoId: String(a.metodoPagamentoId),
        }}
      />
    </>
  );
}
