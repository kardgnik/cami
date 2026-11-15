import Link from "next/link";
import { BotaoConfirmar, BotaoEnviar } from "@/components/botao-confirmar";
import { SeletorMes } from "@/components/seletor-mes";
import { Cabecalho, DescricaoSessao, Indicador, SeloSessao, Vazio } from "@/components/ui";
import { dataDoLancamento, nomeDaSessao } from "@/lib/labels";
import type { Prisma } from "@/generated/prisma/client";
import { hojeISO, intervaloDoMes, lerMes, mesAtual, rotuloMes } from "@/lib/datas";
import { exigirGerente } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { valorSessaoDaMesa } from "@/lib/finance";
import { formatarData, formatarMoeda } from "@/lib/format";
import { mensalidadesDoMes, valorOneshot } from "@/lib/sessoes";
import { desfazerPagamento, excluirSessao, lancarMensalidadesDoMes, marcarPaga, marcarTodasPagas } from "./actions";
import { LancarMensalidades } from "./lancar-mensalidades";
import { RegistrarSessaoForm } from "./registrar-form";

export const metadata = { title: "Sessões e pagamentos · Gestão de Mesas" };

function texto(v: string | string[] | undefined) {
  return typeof v === "string" ? v : "";
}

export default async function Page(props: PageProps<"/sessoes">) {
  await exigirGerente();
  const sp = await props.searchParams;
  const mes = lerMes(texto(sp.mes)) ?? mesAtual();
  const status = ["a-receber", "pago"].includes(texto(sp.status)) ? texto(sp.status) : "";
  const mestreIdNum = Number(texto(sp.mestreId));
  const mestreId = Number.isSafeInteger(mestreIdNum) && mestreIdNum > 0 ? mestreIdNum : undefined;
  const { inicio, fim } = intervaloDoMes(mes);

  // indicadores e resumo usam mês + mestre; a tabela também aplica o status
  const doMes: Prisma.SessaoWhereInput = { data: { gte: inicio, lt: fim }, mestreId };
  const [sessoesDoMes, mestres, mesasAtivas, mensalidades] = await Promise.all([
    prisma.sessao.findMany({
      where: doMes,
      include: {
        mesa: { select: { id: true, nome: true } },
        mestre: { select: { id: true, nome: true, chavePix: true } },
      },
      orderBy: [{ data: "desc" }, { id: "desc" }],
    }),
    prisma.mestre.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true, ativo: true } }),
    prisma.mesa.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
      include: { tipoMesa: true },
    }),
    mensalidadesDoMes(mes, mestreId),
  ]);

  // "a receber" = ainda não pago e com valor (sessões de mesas pagas por aluno não têm valor)
  const pendente = (s: { pagoEm: Date | null; valorCentavos: number }) => !s.pagoEm && s.valorCentavos > 0;
  const sessoes = sessoesDoMes.filter((s) => (status === "a-receber" ? pendente(s) : status === "pago" ? !!s.pagoEm : true));
  const soma = (lista: typeof sessoesDoMes) => lista.reduce((t, s) => t + s.valorCentavos, 0);
  const total = soma(sessoesDoMes);
  const aReceber = soma(sessoesDoMes.filter(pendente));
  const qtdSessoes = sessoesDoMes.filter((s) => s.tipo !== "MENSALIDADE").length;
  const qtdMensalidades = sessoesDoMes.length - qtdSessoes;
  const mensalidadesPendentes = mensalidades.filter((m) => !m.lancada && m.alunos > 0);
  const mesFuturo = mes > mesAtual();

  const porMestre = new Map<
    number,
    { id: number; nome: string; chavePix: string | null; sessoes: number; total: number; aReceber: number }
  >();
  for (const s of sessoesDoMes) {
    const g = porMestre.get(s.mestre.id) ?? { ...s.mestre, sessoes: 0, total: 0, aReceber: 0 };
    if (s.tipo !== "MENSALIDADE") g.sessoes += 1;
    g.total += s.valorCentavos;
    if (pendente(s)) g.aReceber += s.valorCentavos;
    porMestre.set(s.mestre.id, g);
  }
  const resumo = [...porMestre.values()].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const params = { mestreId: mestreId ? String(mestreId) : undefined, status: status || undefined };
  const temFiltro = !!(mestreId || status);

  return (
    <>
      <Cabecalho
        titulo="Sessões e pagamentos"
        descricao="Sessões registradas pelos mestres, mensalidades das mesas pagas por aluno e o que falta pagar a cada um."
        acoes={<SeletorMes caminho="/sessoes" mes={mes} params={params} />}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Indicador rotulo={`Total em ${rotuloMes(mes)}`} valor={formatarMoeda(total)}>
          {qtdSessoes} {qtdSessoes === 1 ? "sessão" : "sessões"}
          {qtdMensalidades > 0 && ` · ${qtdMensalidades} ${qtdMensalidades === 1 ? "mensalidade" : "mensalidades"}`}
        </Indicador>
        <Indicador rotulo="A receber (mestres)" valor={formatarMoeda(aReceber)} destaque={aReceber > 0 ? "ambar" : undefined} />
        <Indicador rotulo="Pago" valor={formatarMoeda(total - aReceber)} destaque="verde" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-6">
          <form method="get" className="cartao grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto]">
            <input type="hidden" name="mes" value={mes} />
            <select name="mestreId" defaultValue={mestreId ?? ""} className="input" aria-label="Mestre">
              <option value="">Todos os mestres</option>
              {mestres.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </select>
            <select name="status" defaultValue={status} className="input" aria-label="Status">
              <option value="">Todas</option>
              <option value="a-receber">A receber</option>
              <option value="pago">Pagas</option>
            </select>
            <div className="flex gap-2">
              <button type="submit" className="btn-secundario">
                Filtrar
              </button>
              {temFiltro && (
                <Link href={`/sessoes?mes=${mes}`} className="btn-secundario">
                  Limpar
                </Link>
              )}
            </div>
          </form>

          <section className="cartao overflow-x-auto">
            {sessoes.length === 0 ? (
              <Vazio>Nenhum lançamento em {rotuloMes(mes)} com esses filtros.</Vazio>
            ) : (
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Mesa</th>
                    <th>Mestre</th>
                    <th className="num">Valor</th>
                    <th>Status</th>
                    <th className="text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {sessoes.map((s) => (
                    <tr key={s.id}>
                      <td className="whitespace-nowrap">
                        {dataDoLancamento(s)}
                        {s.observacoes && <p className="max-w-48 truncate text-xs text-slate-500">{s.observacoes}</p>}
                      </td>
                      <td>
                        {s.mesa ? (
                          <span className="inline-flex flex-wrap items-center gap-1.5">
                            <Link href={`/mesas/${s.mesa.id}`} className="link">
                              {s.mesa.nome}
                            </Link>
                            <DescricaoSessao sessao={s} semNome />
                          </span>
                        ) : (
                          <DescricaoSessao sessao={s} />
                        )}
                      </td>
                      <td>{s.mestre.nome}</td>
                      <td className="num">{formatarMoeda(s.valorCentavos)}</td>
                      <td className="whitespace-nowrap">
                        <SeloSessao pagoEm={s.pagoEm} valorCentavos={s.valorCentavos} />
                      </td>
                      <td>
                        <div className="flex flex-wrap justify-end gap-2">
                          {s.pagoEm ? (
                            <form action={desfazerPagamento.bind(null, s.id)}>
                              <BotaoEnviar className="btn-secundario whitespace-nowrap" pendente="...">
                                Desfazer pagamento
                              </BotaoEnviar>
                            </form>
                          ) : s.valorCentavos > 0 ? (
                            <form action={marcarPaga.bind(null, s.id)}>
                              <BotaoEnviar className="btn-secundario whitespace-nowrap" pendente="...">
                                Marcar como paga
                              </BotaoEnviar>
                            </form>
                          ) : null}
                          <form action={excluirSessao.bind(null, s.id)}>
                            <BotaoConfirmar
                              className="btn-perigo"
                              confirmacao={
                                s.tipo === "MENSALIDADE"
                                  ? `Excluir a mensalidade de ${nomeDaSessao(s)} de ${dataDoLancamento(s)}? Ela pode ser lançada de novo, com os alunos atuais.`
                                  : `Excluir a sessão de ${nomeDaSessao(s)} em ${formatarData(s.data)}?`
                              }
                            >
                              Excluir
                            </BotaoConfirmar>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {mensalidades.length > 0 && (
            <section className="cartao overflow-x-auto">
              <div className="px-4 pt-4 pb-3">
                <h2 className="text-sm font-semibold text-slate-900">
                  Mensalidades por aluno · <span className="first-letter:uppercase">{rotuloMes(mes)}</span>
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Mesas em que o mestre recebe por aluno, por mês. Ao lançar, o valor fica gravado com os alunos da mesa
                  naquele momento e entra em &quot;a receber&quot;. Se os alunos mudarem antes do pagamento, exclua a
                  mensalidade na lista acima e lance de novo.
                </p>
              </div>
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Mesa</th>
                    <th>Mestre</th>
                    <th className="num">Alunos × valor</th>
                    <th className="num">Mensalidade</th>
                    <th>Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {mensalidades.map((m) => {
                    const alunos = m.lancada ? (m.lancada.alunos ?? m.alunos) : m.alunos;
                    const valor = m.lancada ? m.lancada.valorCentavos : m.valorCentavos;
                    return (
                      <tr key={m.mesaId}>
                        <td>
                          <Link href={`/mesas/${m.mesaId}`} className="link">
                            {m.mesa}
                          </Link>
                        </td>
                        <td>{m.mestre}</td>
                        <td className="num text-slate-600">
                          {alunos} × {formatarMoeda(alunos > 0 ? Math.round(valor / alunos) : m.valorAlunoCentavos)}
                        </td>
                        <td className="num font-medium">{formatarMoeda(valor)}</td>
                        <td className="whitespace-nowrap">
                          {m.lancada ? (
                            <SeloSessao pagoEm={m.lancada.pagoEm} valorCentavos={m.lancada.valorCentavos} />
                          ) : m.alunos === 0 ? (
                            <span className="text-xs text-slate-500">Sem alunos</span>
                          ) : (
                            <span className="text-xs font-medium text-amber-700">Não lançada</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <LancarMensalidades
                acao={lancarMensalidadesDoMes.bind(null, mes)}
                pendentes={mensalidadesPendentes.length}
                mesFuturo={mesFuturo}
                rotulo={`Lançar ${mensalidadesPendentes.length === 1 ? "mensalidade" : `${mensalidadesPendentes.length} mensalidades`} de ${rotuloMes(mes)}`}
              />
            </section>
          )}

          <section className="cartao overflow-x-auto">
            <h2 className="px-4 pt-4 pb-3 text-sm font-semibold text-slate-900">
              Resumo por mestre · <span className="first-letter:uppercase">{rotuloMes(mes)}</span>
            </h2>
            {resumo.length === 0 ? (
              <Vazio>Sem lançamentos neste mês.</Vazio>
            ) : (
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Mestre</th>
                    <th>Chave Pix</th>
                    <th className="num">Sessões</th>
                    <th className="num">Total</th>
                    <th className="num">A receber</th>
                    <th className="text-right">Pagamento</th>
                  </tr>
                </thead>
                <tbody>
                  {resumo.map((g) => (
                    <tr key={g.id}>
                      <td className="font-medium">{g.nome}</td>
                      <td className="text-slate-600">{g.chavePix ?? "—"}</td>
                      <td className="num">{g.sessoes}</td>
                      <td className="num">{formatarMoeda(g.total)}</td>
                      <td className={`num ${g.aReceber > 0 ? "font-semibold text-amber-700" : ""}`}>
                        {formatarMoeda(g.aReceber)}
                      </td>
                      <td>
                        <div className="flex justify-end">
                          {g.aReceber > 0 ? (
                            <form action={marcarTodasPagas.bind(null, g.id, mes)}>
                              <BotaoConfirmar
                                className="btn-primario whitespace-nowrap"
                                confirmacao={`Marcar como pago tudo o que ${g.nome} tem a receber de ${rotuloMes(mes)} (${formatarMoeda(g.aReceber)})?`}
                              >
                                Marcar tudo como pago
                              </BotaoConfirmar>
                            </form>
                          ) : (
                            <span className="text-xs text-emerald-700">Tudo pago</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>

        <aside className="h-fit lg:sticky lg:top-8">
          <RegistrarSessaoForm
            hoje={hojeISO()}
            valorOneshotCentavos={await valorOneshot()}
            mestres={mestres.filter((m) => m.ativo).map(({ id, nome }) => ({ id, nome }))}
            mesas={mesasAtivas.map((m) => ({
              id: m.id,
              nome: m.nome,
              detalhe: m.tipoMesa.nome,
              porAluno: m.tipoMesa.pagamentoMestre === "POR_ALUNO",
              mestreId: m.mestreId,
              valorCentavos: valorSessaoDaMesa(m, m.tipoMesa),
            }))}
          />
        </aside>
      </div>
    </>
  );
}
