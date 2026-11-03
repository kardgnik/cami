import Link from "next/link";
import { notFound } from "next/navigation";
import { Cabecalho, SeloSessao, SeloStatus, Vazio } from "@/components/ui";
import { exigirGerente } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { formatarData, formatarMoeda, paraInput } from "@/lib/format";
import { atualizarMesa } from "../actions";
import { MesaForm } from "../form";
import { carregarOpcoesMesa } from "../opcoes";

export default async function Page(props: PageProps<"/mesas/[id]">) {
  await exigirGerente();
  const id = Number((await props.params).id);
  if (!Number.isSafeInteger(id)) notFound();
  const mesa = await prisma.mesa.findUnique({
    where: { id },
    include: {
      assinaturas: {
        include: {
          assinatura: {
            include: { jogador: { select: { id: true, nome: true } }, plano: { select: { nome: true } } },
          },
        },
      },
      sessoes: {
        orderBy: { data: "desc" },
        take: 10,
        include: { mestre: { select: { nome: true } } },
      },
    },
  });
  if (!mesa) notFound();
  const opcoes = await carregarOpcoesMesa(mesa.mestreId);
  const vinculos = [...mesa.assinaturas].sort((a, b) =>
    a.assinatura.jogador.nome.localeCompare(b.assinatura.jogador.nome, "pt-BR"),
  );
  const ocupados = vinculos.filter((v) => v.assinatura.status !== "CANCELADO").length;

  return (
    <>
      <Cabecalho titulo={`Editar mesa: ${mesa.nome}`} voltar={{ href: "/mesas", rotulo: "Mesas" }} />
      <MesaForm
        acao={atualizarMesa.bind(null, mesa.id)}
        {...opcoes}
        inicial={{
          nome: mesa.nome,
          descricao: mesa.descricao ?? "",
          tipoMesaId: String(mesa.tipoMesaId),
          mestreId: mesa.mestreId ? String(mesa.mestreId) : "",
          valorSessaoCentavos: mesa.valorSessaoCentavos === null ? "" : paraInput(mesa.valorSessaoCentavos),
          sessoesPorMes: String(mesa.sessoesPorMes),
          capacidade: String(mesa.capacidade),
        }}
      />

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <section className="cartao overflow-x-auto">
          <h2 className="px-4 pt-4 pb-3 text-sm font-semibold text-slate-900">
            Jogadores ({ocupados}/{mesa.capacidade})
          </h2>
          {vinculos.length === 0 ? (
            <Vazio>Nenhum jogador nesta mesa. Vincule pela assinatura do jogador.</Vazio>
          ) : (
            <table className="tabela">
              <thead>
                <tr>
                  <th>Jogador</th>
                  <th>Plano</th>
                  <th>Assinatura</th>
                </tr>
              </thead>
              <tbody>
                {vinculos.map((v) => (
                  <tr key={v.assinaturaId} className={v.assinatura.status === "CANCELADO" ? "text-slate-400" : ""}>
                    <td>
                      <Link href={`/jogadores/${v.assinatura.jogador.id}`} className="link">
                        {v.assinatura.jogador.nome}
                      </Link>
                    </td>
                    <td>{v.assinatura.plano.nome}</td>
                    <td>
                      <SeloStatus status={v.assinatura.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="cartao overflow-x-auto">
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <h2 className="text-sm font-semibold text-slate-900">Últimas sessões</h2>
            <Link href="/sessoes" className="text-xs link">
              Ver todas
            </Link>
          </div>
          {mesa.sessoes.length === 0 ? (
            <Vazio>Nenhuma sessão registrada.</Vazio>
          ) : (
            <table className="tabela">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Mestre</th>
                  <th className="num">Valor</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {mesa.sessoes.map((s) => (
                  <tr key={s.id}>
                    <td>{formatarData(s.data)}</td>
                    <td>{s.mestre.nome}</td>
                    <td className="num">{formatarMoeda(s.valorCentavos)}</td>
                    <td>
                      <SeloSessao pagoEm={s.pagoEm} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </>
  );
}
