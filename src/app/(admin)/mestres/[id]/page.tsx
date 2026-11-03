import Link from "next/link";
import { notFound } from "next/navigation";
import { Cabecalho, Indicador, SeloAtivo, Vazio } from "@/components/ui";
import { intervaloDoMes, mesAtual } from "@/lib/datas";
import { exigirGerente } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { valorSessaoDaMesa } from "@/lib/finance";
import { formatarMoeda } from "@/lib/format";
import { atualizarMestre } from "../actions";
import { MestreForm } from "../form";

export default async function Page(props: PageProps<"/mestres/[id]">) {
  await exigirGerente();
  const id = Number((await props.params).id);
  if (!Number.isSafeInteger(id)) notFound();
  const mestre = await prisma.mestre.findUnique({
    where: { id },
    select: {
      id: true,
      nome: true,
      email: true,
      telefone: true,
      chavePix: true,
      ativo: true,
      mesas: { include: { tipoMesa: true }, orderBy: [{ ativo: "desc" }, { nome: "asc" }] },
    },
  });
  if (!mestre) notFound();

  const { inicio, fim } = intervaloDoMes(mesAtual());
  // pagoEm é um instante: o mês começa à meia-noite de Brasília (UTC-3, sem horário de verão)
  const tresHoras = 3 * 60 * 60 * 1000;
  const pagoDesde = new Date(inicio.getTime() + tresHoras);
  const pagoAte = new Date(fim.getTime() + tresHoras);
  const [aReceber, pagoNoMes, sessoesNoMes] = await Promise.all([
    prisma.sessao.aggregate({ where: { mestreId: id, pagoEm: null }, _sum: { valorCentavos: true } }),
    prisma.sessao.aggregate({
      where: { mestreId: id, pagoEm: { gte: pagoDesde, lt: pagoAte } },
      _sum: { valorCentavos: true },
    }),
    prisma.sessao.count({ where: { mestreId: id, data: { gte: inicio, lt: fim } } }),
  ]);

  return (
    <>
      <Cabecalho
        titulo={mestre.nome}
        descricao={mestre.email}
        voltar={{ href: "/mestres", rotulo: "Mestres" }}
        acoes={
          <Link href={`/sessoes?mestreId=${mestre.id}`} className="btn-secundario">
            Ver sessões
          </Link>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Indicador rotulo="A receber" valor={formatarMoeda(aReceber._sum.valorCentavos ?? 0)} destaque="ambar">
          Sessões ainda não pagas
        </Indicador>
        <Indicador rotulo="Pago neste mês" valor={formatarMoeda(pagoNoMes._sum.valorCentavos ?? 0)} destaque="verde" />
        <Indicador rotulo="Sessões neste mês" valor={String(sessoesNoMes)} />
      </div>

      <MestreForm
        acao={atualizarMestre.bind(null, mestre.id)}
        novo={false}
        inicial={{
          nome: mestre.nome,
          email: mestre.email,
          telefone: mestre.telefone ?? "",
          chavePix: mestre.chavePix ?? "",
        }}
      />

      <section className="cartao mt-8 overflow-x-auto">
        <h2 className="px-4 pt-4 pb-3 text-sm font-semibold text-slate-900">Mesas deste mestre</h2>
        {mestre.mesas.length === 0 ? (
          <Vazio>
            Nenhuma mesa. Atribua o mestre na{" "}
            <Link href="/mesas" className="link">
              edição de uma mesa
            </Link>
            .
          </Vazio>
        ) : (
          <table className="tabela">
            <thead>
              <tr>
                <th>Mesa</th>
                <th>Tipo</th>
                <th className="num">Valor/sessão</th>
                <th className="num">Sessões/mês</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {mestre.mesas.map((m) => (
                <tr key={m.id} className={m.ativo ? "" : "text-slate-400"}>
                  <td>
                    <Link href={`/mesas/${m.id}`} className="link">
                      {m.nome}
                    </Link>
                  </td>
                  <td>{m.tipoMesa.nome}</td>
                  <td className="num">{formatarMoeda(valorSessaoDaMesa(m, m.tipoMesa))}</td>
                  <td className="num">{m.sessoesPorMes}</td>
                  <td>
                    <SeloAtivo ativo={m.ativo} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
