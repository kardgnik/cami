import { notFound } from "next/navigation";
import { Cabecalho } from "@/components/ui";
import { exigirGerente } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { paraInputData } from "@/lib/format";
import { carregarOpcoesAssinatura } from "../../../_opcoes";
import { atualizarAssinatura } from "../../../actions";
import { AssinaturaForm } from "../../../assinatura-form";

export const metadata = { title: "Editar assinatura · Gestão de Mesas" };

export default async function Page(props: PageProps<"/jogadores/[id]/assinaturas/[assinaturaId]">) {
  await exigirGerente();
  const params = await props.params;
  const jogadorId = Number(params.id);
  const assinaturaId = Number(params.assinaturaId);
  if (!Number.isSafeInteger(jogadorId) || !Number.isSafeInteger(assinaturaId)) notFound();

  const a = await prisma.assinatura.findFirst({
    where: { id: assinaturaId, jogadorId },
    include: { jogador: { select: { nome: true } }, mesas: { select: { mesaId: true } } },
  });
  if (!a) notFound();

  const mesaIds = a.mesas.map((m) => m.mesaId);
  const opcoes = await carregarOpcoesAssinatura({
    id: a.id,
    planoId: a.planoId,
    plataformaId: a.plataformaId,
    metodoPagamentoId: a.metodoPagamentoId,
    mesaIds,
  });
  const voltar = `/jogadores/${jogadorId}`;

  return (
    <>
      <Cabecalho titulo={`Assinatura de ${a.jogador.nome}`} voltar={{ href: voltar, rotulo: a.jogador.nome }} />
      <AssinaturaForm
        acao={atualizarAssinatura.bind(null, jogadorId, a.id)}
        voltarPara={voltar}
        {...opcoes}
        inicial={{
          status: a.status,
          dataInicio: paraInputData(a.dataInicio),
          observacoes: a.observacoes ?? "",
          planoId: String(a.planoId),
          plataformaId: String(a.plataformaId),
          metodoPagamentoId: String(a.metodoPagamentoId),
          mesaIds: mesaIds.map(String),
        }}
      />
    </>
  );
}
