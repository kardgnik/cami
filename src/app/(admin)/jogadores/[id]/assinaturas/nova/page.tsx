import { notFound } from "next/navigation";
import { Cabecalho } from "@/components/ui";
import { exigirGerente } from "@/lib/dal";
import { hojeISO } from "@/lib/datas";
import { prisma } from "@/lib/db";
import { carregarOpcoesAssinatura } from "../../../_opcoes";
import { criarAssinatura } from "../../../actions";
import { AssinaturaForm } from "../../../assinatura-form";
import { AvisoFaltando } from "../_faltando";

export const metadata = { title: "Nova assinatura · Gestão de Mesas" };

export default async function Page(props: PageProps<"/jogadores/[id]/assinaturas/nova">) {
  await exigirGerente();
  const id = Number((await props.params).id);
  if (!Number.isSafeInteger(id)) notFound();
  const jogador = await prisma.jogador.findUnique({ where: { id }, select: { id: true, nome: true } });
  if (!jogador) notFound();
  const opcoes = await carregarOpcoesAssinatura();
  const voltar = `/jogadores/${jogador.id}`;

  return (
    <>
      <Cabecalho titulo={`Nova assinatura de ${jogador.nome}`} voltar={{ href: voltar, rotulo: jogador.nome }} />
      <AvisoFaltando planos={opcoes.planos.length} plataformas={opcoes.plataformas.length} metodos={opcoes.metodos.length} />
      <AssinaturaForm
        acao={criarAssinatura.bind(null, jogador.id)}
        voltarPara={voltar}
        {...opcoes}
        inicial={{
          status: "ATIVO",
          dataInicio: hojeISO(),
          observacoes: "",
          planoId: "",
          plataformaId: "",
          metodoPagamentoId: "",
          mesaIds: [],
        }}
      />
    </>
  );
}
