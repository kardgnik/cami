import { BotaoConfirmar } from "@/components/botao-confirmar";
import { SeletorMes } from "@/components/seletor-mes";
import { Cabecalho, DescricaoSessao, Faltas, Indicador, SeloSessao, Vazio } from "@/components/ui";
import { dataDoLancamento, nomeDaSessao, rotuloDia } from "@/lib/labels";
import { exigirMestre } from "@/lib/dal";
import { hojeISO, intervaloDoMes, lerMes, mesAtual, rotuloMes } from "@/lib/datas";
import { prisma } from "@/lib/db";
import { mensalidadeDaMesa, valorAlunoDaMesa, valorSessaoDaMesa } from "@/lib/finance";
import { formatarData, formatarMoeda } from "@/lib/format";
import { excluirSessao } from "./actions";
import { faltasDasSessoes, mesasDoMestre } from "@/lib/mesas";
import { valorOneshot } from "@/lib/sessoes";
import { SessaoForm } from "./sessao-form";

export default async function Page(props: PageProps<"/mestre">) {
  const mestre = await exigirMestre();
  const sp = await props.searchParams;
  const mes = lerMes(typeof sp.mes === "string" ? sp.mes : null) ?? mesAtual();
  const { inicio, fim } = intervaloDoMes(mes);

  const [aReceber, sessoes, mesas] = await Promise.all([
    prisma.sessao.aggregate({
      where: { mestreId: mestre.id, pagoEm: null, valorCentavos: { gt: 0 } },
      _sum: { valorCentavos: true },
      _count: true,
    }),
    prisma.sessao.findMany({
      where: { mestreId: mestre.id, data: { gte: inicio, lt: fim } },
      include: { mesa: { select: { nome: true, mestreId: true, mestre2Id: true } } },
      orderBy: [{ data: "desc" }, { id: "desc" }],
    }),
    prisma.mesa.findMany({
      where: { ativo: true, ...mesasDoMestre(mestre.id) },
      orderBy: { nome: "asc" },
      include: {
        tipoMesa: true,
        mestre: { select: { id: true, nome: true } },
        mestre2: { select: { id: true, nome: true } },
        // jogadores com assinatura não cancelada; só o nome (o mestre não vê contato nem financeiro)
        assinaturas: {
          where: { assinatura: { status: { not: "CANCELADO" } } },
          select: { assinatura: { select: { jogador: { select: { id: true, nome: true } } } } },
        },
      },
    }),
  ]);

  const totalMes = sessoes.reduce((t, s) => t + s.valorCentavos, 0);
  const pagoMes = sessoes.filter((s) => s.pagoEm).reduce((t, s) => t + s.valorCentavos, 0);
  const rotulo = rotuloMes(mes);
  const opcoes = mesas.map((m) => ({
    id: m.id,
    nome: m.nome,
    detalhe: m.tipoMesa.nome,
    porAluno: m.tipoMesa.pagamentoMestre === "POR_ALUNO",
    valorCentavos: valorSessaoDaMesa(m, m.tipoMesa),
    // jogadores da mesa (sem repetir quem tem duas assinaturas nela), para marcar faltas
    jogadores: [...new Map(m.assinaturas.map((a) => [a.assinatura.jogador.id, a.assinatura.jogador])).values()].sort((a, b) =>
      a.nome.localeCompare(b.nome, "pt-BR"),
    ),
  }));
  const faltas = await faltasDasSessoes(sessoes);
  const qtdSessoes = sessoes.filter((s) => s.tipo !== "MENSALIDADE").length;
  const valorDaOneshot = await valorOneshot();

  return (
    <>
      <Cabecalho titulo={`Olá, ${mestre.nome.split(" ")[0]}!`} descricao="Registre as sessões que você mestrou e acompanhe o que tem a receber." />

      <div className="grid gap-4 sm:grid-cols-3">
        <Indicador rotulo="A receber" valor={formatarMoeda(aReceber._sum.valorCentavos ?? 0)} destaque="ambar">
          {aReceber._count} {aReceber._count === 1 ? "lançamento ainda não pago" : "lançamentos ainda não pagos"}
        </Indicador>
        <Indicador rotulo={`Lançado em ${rotulo}`} valor={formatarMoeda(totalMes)}>
          {qtdSessoes} {qtdSessoes === 1 ? "sessão" : "sessões"}
          {sessoes.length > qtdSessoes && " + mensalidade"}
        </Indicador>
        <Indicador rotulo={`Recebido em ${rotulo}`} valor={formatarMoeda(pagoMes)} destaque="verde" />
      </div>

      <section className="cartao mt-6 p-5">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Registrar sessão</h2>
        {opcoes.length === 0 && (
          <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Você ainda não tem mesas: por enquanto só é possível registrar oneshots. Peça ao gerente para vincular você a uma
            mesa.
          </p>
        )}
        <SessaoForm mesas={opcoes} hoje={hojeISO()} valorOneshotCentavos={valorDaOneshot} />
      </section>

      <section className="mt-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900">Minhas sessões e mensalidades</h2>
          <SeletorMes caminho="/mestre" mes={mes} />
        </div>
        <div className="cartao overflow-x-auto">
          {sessoes.length === 0 ? (
            <Vazio>Nada lançado em {rotulo}.</Vazio>
          ) : (
            <table className="tabela">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Mesa</th>
                  <th className="num">Valor</th>
                  <th>Status</th>
                  <th className="text-right">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sessoes.map((s) => (
                  <tr key={s.id}>
                    <td className="whitespace-nowrap">{dataDoLancamento(s)}</td>
                    <td>
                      <DescricaoSessao sessao={s} />
                      <Faltas nomes={faltas.de(s)} />
                      {s.observacoes && <p className="max-w-xs truncate text-xs text-slate-500">{s.observacoes}</p>}
                    </td>
                    <td className="num">{formatarMoeda(s.valorCentavos)}</td>
                    <td>
                      <SeloSessao pagoEm={s.pagoEm} valorCentavos={s.valorCentavos} />
                    </td>
                    <td className="text-right">
                      {!s.pagoEm && s.tipo !== "MENSALIDADE" && (
                        <form action={excluirSessao.bind(null, s.id)}>
                          <BotaoConfirmar
                            className="btn-perigo"
                            confirmacao={`Excluir a sessão de ${formatarData(s.data)} (${nomeDaSessao(s)})?${
                              s.mesa?.mestre2Id ? " Ela também sai do outro mestre da mesa, se ainda não foi paga." : ""
                            }`}
                          >
                            Excluir
                          </BotaoConfirmar>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-base font-semibold text-slate-900">Minhas mesas</h2>
        {mesas.length === 0 ? (
          <div className="cartao">
            <Vazio>Nenhuma mesa vinculada a você.</Vazio>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {mesas.map((m) => {
              const nomes = [...new Set(m.assinaturas.map((a) => a.assinatura.jogador.nome.split(" ")[0]))];
              const porAluno = m.tipoMesa.pagamentoMestre === "POR_ALUNO";
              const colega = [m.mestre, m.mestre2].find((x) => x && x.id !== mestre.id)?.nome;
              const dia = rotuloDia(m.diaSemana);
              return (
                <div key={m.id} className="cartao p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">{m.nome}</p>
                      {colega && <p className="text-xs text-slate-500">com {colega} · cada um recebe o valor cheio</p>}
                    </div>
                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                      {m.tipoMesa.nome}
                    </span>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    {dia && (
                      <>
                        <dt className="text-slate-500">Dia</dt>
                        <dd className="text-right">{dia}</dd>
                      </>
                    )}
                    {porAluno ? (
                      <>
                        <dt className="text-slate-500">Por aluno, por mês</dt>
                        <dd className="text-right font-medium tabular-nums">{formatarMoeda(valorAlunoDaMesa(m, m.tipoMesa))}</dd>
                        <dt className="text-slate-500">Mensalidade hoje</dt>
                        <dd className="text-right font-medium tabular-nums text-emerald-700">
                          {formatarMoeda(mensalidadeDaMesa(m, m.tipoMesa, m.assinaturas.length))}
                        </dd>
                      </>
                    ) : (
                      <>
                        <dt className="text-slate-500">Por sessão</dt>
                        <dd className="text-right font-medium tabular-nums">{formatarMoeda(valorSessaoDaMesa(m, m.tipoMesa))}</dd>
                        <dt className="text-slate-500">Sessões/mês</dt>
                        <dd className="text-right tabular-nums">{m.sessoesPorMes}</dd>
                      </>
                    )}
                    <dt className="text-slate-500">Jogadores</dt>
                    <dd className="text-right tabular-nums">
                      {m.assinaturas.length}/{m.capacidade}
                    </dd>
                  </dl>
                  {nomes.length > 0 && <p className="mt-3 text-xs text-slate-500">{nomes.join(", ")}</p>}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
