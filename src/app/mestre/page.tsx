import { BotaoConfirmar } from "@/components/botao-confirmar";
import { SeletorMes } from "@/components/seletor-mes";
import { Cabecalho, Indicador, SeloSessao, Vazio } from "@/components/ui";
import { exigirMestre } from "@/lib/dal";
import { hojeISO, intervaloDoMes, lerMes, mesAtual, rotuloMes } from "@/lib/datas";
import { prisma } from "@/lib/db";
import { valorSessaoDaMesa } from "@/lib/finance";
import { formatarData, formatarMoeda } from "@/lib/format";
import { excluirSessao } from "./actions";
import { SessaoForm } from "./sessao-form";

export default async function Page(props: PageProps<"/mestre">) {
  const mestre = await exigirMestre();
  const sp = await props.searchParams;
  const mes = lerMes(typeof sp.mes === "string" ? sp.mes : null) ?? mesAtual();
  const { inicio, fim } = intervaloDoMes(mes);

  const [aReceber, sessoes, mesas] = await Promise.all([
    prisma.sessao.aggregate({
      where: { mestreId: mestre.id, pagoEm: null },
      _sum: { valorCentavos: true },
      _count: true,
    }),
    prisma.sessao.findMany({
      where: { mestreId: mestre.id, data: { gte: inicio, lt: fim } },
      include: { mesa: { select: { nome: true } } },
      orderBy: [{ data: "desc" }, { id: "desc" }],
    }),
    prisma.mesa.findMany({
      where: { mestreId: mestre.id, ativo: true },
      orderBy: { nome: "asc" },
      include: {
        tipoMesa: true,
        // jogadores com assinatura não cancelada; só o nome (o mestre não vê contato nem financeiro)
        assinaturas: {
          where: { assinatura: { status: { not: "CANCELADO" } } },
          select: { assinatura: { select: { jogador: { select: { nome: true } } } } },
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
    tipo: m.tipoMesa.nome,
    valorSessaoCentavos: valorSessaoDaMesa(m, m.tipoMesa),
  }));

  return (
    <>
      <Cabecalho titulo={`Olá, ${mestre.nome.split(" ")[0]}!`} descricao="Registre as sessões que você mestrou e acompanhe o que tem a receber." />

      <div className="grid gap-4 sm:grid-cols-3">
        <Indicador rotulo="A receber" valor={formatarMoeda(aReceber._sum.valorCentavos ?? 0)} destaque="ambar">
          {aReceber._count} sessão{aReceber._count === 1 ? "" : "ões"} ainda não paga{aReceber._count === 1 ? "" : "s"}
        </Indicador>
        <Indicador rotulo={`Sessões em ${rotulo}`} valor={formatarMoeda(totalMes)}>
          {sessoes.length} sessão{sessoes.length === 1 ? "" : "ões"}
        </Indicador>
        <Indicador rotulo={`Recebido em ${rotulo}`} valor={formatarMoeda(pagoMes)} destaque="verde" />
      </div>

      <section className="cartao mt-6 p-5">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Registrar sessão</h2>
        {opcoes.length === 0 ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Você ainda não tem mesas. Peça ao gerente para vincular você a uma mesa.
          </p>
        ) : (
          <SessaoForm mesas={opcoes} hoje={hojeISO()} />
        )}
      </section>

      <section className="mt-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900">Minhas sessões</h2>
          <SeletorMes caminho="/mestre" mes={mes} />
        </div>
        <div className="cartao overflow-x-auto">
          {sessoes.length === 0 ? (
            <Vazio>Nenhuma sessão registrada em {rotulo}.</Vazio>
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
                    <td className="whitespace-nowrap">{formatarData(s.data)}</td>
                    <td>
                      {s.mesa.nome}
                      {s.observacoes && <p className="max-w-xs truncate text-xs text-slate-500">{s.observacoes}</p>}
                    </td>
                    <td className="num">{formatarMoeda(s.valorCentavos)}</td>
                    <td>
                      <SeloSessao pagoEm={s.pagoEm} />
                    </td>
                    <td className="text-right">
                      {!s.pagoEm && (
                        <form action={excluirSessao.bind(null, s.id)}>
                          <BotaoConfirmar
                            className="btn-perigo"
                            confirmacao={`Excluir a sessão de ${formatarData(s.data)} (${s.mesa.nome})?`}
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
              return (
                <div key={m.id} className="cartao p-5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-slate-900">{m.nome}</p>
                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                      {m.tipoMesa.nome}
                    </span>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <dt className="text-slate-500">Por sessão</dt>
                    <dd className="text-right font-medium tabular-nums">{formatarMoeda(valorSessaoDaMesa(m, m.tipoMesa))}</dd>
                    <dt className="text-slate-500">Sessões/mês</dt>
                    <dd className="text-right tabular-nums">{m.sessoesPorMes}</dd>
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
