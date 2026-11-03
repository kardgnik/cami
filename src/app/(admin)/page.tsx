import Link from "next/link";
import type { ReactNode } from "react";
import { Cabecalho, Indicador, Vazio } from "@/components/ui";
import { financeiroDaAssinatura, somar } from "@/lib/assinaturas";
import { exigirGerente } from "@/lib/dal";
import { intervaloDoMes, mesAtual, rotuloMes } from "@/lib/datas";
import { prisma } from "@/lib/db";
import { custoMensalPrevistoDaMesa, type ResultadoLiquido } from "@/lib/finance";
import { descreverTaxa, formatarMoeda } from "@/lib/format";

export const metadata = { title: "Visão geral · Gestão de Mesas" };

type Grupo = { nome: string; detalhe?: string; quantidade: number; total: ResultadoLiquido };

function agrupar<T>(itens: T[], chave: (t: T) => string, mensal: (t: T) => ResultadoLiquido, detalhe?: (t: T) => string) {
  const mapa = new Map<string, T[]>();
  for (const i of itens) {
    const k = chave(i);
    mapa.set(k, [...(mapa.get(k) ?? []), i]);
  }
  return [...mapa.entries()]
    .map(([nome, grupo]): Grupo => ({
      nome,
      detalhe: detalhe?.(grupo[0]),
      quantidade: grupo.length,
      total: somar(grupo.map(mensal)),
    }))
    .sort((a, b) => b.total.bruto - a.total.bruto);
}

export default async function Page() {
  await exigirGerente();
  const mes = mesAtual();
  const { inicio, fim } = intervaloDoMes(mes);

  const [assinaturasAtivas, jogadoresAtivos, jogadoresInadimplentes, mesasAtivas, ocupacao, sessoesMes, aPagar, mestres] =
    await Promise.all([
      prisma.assinatura.findMany({
        where: { status: "ATIVO" },
        include: { plano: true, plataforma: true, metodoPagamento: true, jogador: { select: { nome: true } } },
      }),
      prisma.jogador.count({ where: { assinaturas: { some: { status: "ATIVO" } } } }),
      prisma.jogador.count({ where: { assinaturas: { some: { status: "INADIMPLENTE" } } } }),
      prisma.mesa.findMany({ where: { ativo: true }, include: { tipoMesa: true } }),
      prisma.assinaturaMesa.groupBy({
        by: ["mesaId"],
        where: { assinatura: { status: { not: "CANCELADO" } }, mesa: { ativo: true } },
        _count: true,
      }),
      prisma.sessao.groupBy({
        by: ["mestreId"],
        where: { data: { gte: inicio, lt: fim } },
        _count: true,
        _sum: { valorCentavos: true },
      }),
      prisma.sessao.groupBy({ by: ["mestreId"], where: { pagoEm: null }, _sum: { valorCentavos: true } }),
      prisma.mestre.findMany({ select: { id: true, nome: true, ativo: true }, orderBy: { nome: "asc" } }),
    ]);

  // ---------- Entrada ----------
  const linhas = assinaturasAtivas.map((a) => ({ ...a, fin: financeiroDaAssinatura(a) }));
  const entrada = somar(linhas.map((l) => l.fin.mensal));
  const prejuizo = linhas.filter((l) => l.fin.porCobranca.liquido <= 0);

  // ---------- Saída ----------
  const mesasComMestre = mesasAtivas.filter((m) => m.mestreId !== null);
  const mesasSemMestre = mesasAtivas.length - mesasComMestre.length;
  const custoPrevisto = mesasComMestre.reduce((t, m) => t + custoMensalPrevistoDaMesa(m, m.tipoMesa), 0);
  const resultado = entrada.liquido - custoPrevisto;

  const sessoesPorMestre = new Map(sessoesMes.map((s) => [s.mestreId, s]));
  const aPagarPorMestre = new Map(aPagar.map((s) => [s.mestreId, s._sum.valorCentavos ?? 0]));
  const qtdSessoesMes = sessoesMes.reduce((t, s) => t + s._count, 0);
  const valorSessoesMes = sessoesMes.reduce((t, s) => t + (s._sum.valorCentavos ?? 0), 0);
  const totalAPagar = aPagar.reduce((t, s) => t + (s._sum.valorCentavos ?? 0), 0);
  const ocupadas = new Map(ocupacao.map((o) => [o.mesaId, o._count]));

  const porMestre = mestres
    .map((m) => {
      const mesas = mesasComMestre.filter((x) => x.mestreId === m.id);
      const s = sessoesPorMestre.get(m.id);
      return {
        id: m.id,
        nome: m.ativo ? m.nome : `${m.nome} (inativo)`,
        mesas: mesas.length,
        custoPrevisto: mesas.reduce((t, x) => t + custoMensalPrevistoDaMesa(x, x.tipoMesa), 0),
        sessoes: s?._count ?? 0,
        valorMes: s?._sum.valorCentavos ?? 0,
        aPagar: aPagarPorMestre.get(m.id) ?? 0,
      };
    })
    .filter((m) => m.mesas || m.sessoes || m.aPagar)
    .sort((a, b) => b.custoPrevisto - a.custoPrevisto || a.nome.localeCompare(b.nome, "pt-BR"));

  const tipos = new Map<string, { nome: string; mesas: number; ocupadas: number; vagas: number; custo: number }>();
  for (const m of mesasAtivas) {
    const t = tipos.get(m.tipoMesa.nome) ?? { nome: m.tipoMesa.nome, mesas: 0, ocupadas: 0, vagas: 0, custo: 0 };
    t.mesas += 1;
    t.ocupadas += ocupadas.get(m.id) ?? 0;
    t.vagas += m.capacidade;
    if (m.mestreId !== null) t.custo += custoMensalPrevistoDaMesa(m, m.tipoMesa);
    tipos.set(t.nome, t);
  }
  const porTipo = [...tipos.values()].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const porPlataforma = agrupar(linhas, (l) => l.plataforma.nome, (l) => l.fin.mensal, (l) => descreverTaxa(l.plataforma));
  const porPlano = agrupar(linhas, (l) => l.plano.nome, (l) => l.fin.mensal);
  const porMetodo = agrupar(linhas, (l) => l.metodoPagamento.nome, (l) => l.fin.mensal, (l) => descreverTaxa(l.metodoPagamento));

  const vazio = linhas.length === 0 && mesasAtivas.length === 0 && porMestre.length === 0;

  return (
    <>
      <Cabecalho
        titulo="Visão geral"
        descricao="Entrada (assinaturas ativas, já sem taxas) e saída (pagamento dos mestres), em valores mensais. Planos trimestrais, semestrais e anuais são divididos por mês."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Indicador rotulo="Receita líquida / mês" valor={formatarMoeda(entrada.liquido)} destaque="verde">
          Bruto {formatarMoeda(entrada.bruto)} − taxas {formatarMoeda(entrada.totalTaxas)}
        </Indicador>
        <Indicador rotulo="Custo previsto com mestres / mês" valor={`− ${formatarMoeda(custoPrevisto)}`}>
          {mesasComMestre.length} mesa{mesasComMestre.length === 1 ? "" : "s"} com mestre
        </Indicador>
        <Indicador
          rotulo="Resultado previsto / mês"
          valor={formatarMoeda(resultado)}
          destaque={resultado >= 0 ? "verde" : "vermelho"}
        >
          Receita líquida − custo com mestres
        </Indicador>
        <Indicador rotulo="Jogadores ativos" valor={String(jogadoresAtivos)}>
          {jogadoresInadimplentes > 0 ? (
            <Link href="/jogadores?status=INADIMPLENTE" className="text-amber-700 hover:underline">
              {jogadoresInadimplentes} com assinatura inadimplente
            </Link>
          ) : (
            `${linhas.length} assinatura${linhas.length === 1 ? "" : "s"} ativa${linhas.length === 1 ? "" : "s"}`
          )}
        </Indicador>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Indicador rotulo={`Sessões em ${rotuloMes(mes)}`} valor={formatarMoeda(valorSessoesMes)}>
          {qtdSessoesMes} sess{qtdSessoesMes === 1 ? "ão registrada" : "ões registradas"}
        </Indicador>
        <Indicador rotulo="A pagar aos mestres" valor={formatarMoeda(totalAPagar)} destaque={totalAPagar > 0 ? "ambar" : undefined}>
          <Link href="/sessoes?status=a-receber" className="hover:underline">
            Ver sessões a pagar
          </Link>
        </Indicador>
        <Indicador rotulo="Mesas ativas" valor={String(mesasAtivas.length)}>
          {mesasSemMestre > 0 ? (
            <Link href="/mesas" className="text-amber-700 hover:underline">
              {mesasSemMestre} sem mestre
            </Link>
          ) : (
            <Link href="/mesas" className="hover:underline">
              Ver mesas
            </Link>
          )}
        </Indicador>
      </div>

      {prejuizo.length > 0 && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {prejuizo.length} assinatura{prejuizo.length === 1 ? " tem" : "s têm"} valor líquido zero ou negativo (as taxas
          superam o valor do plano): {prejuizo.slice(0, 5).map((p) => p.jogador.nome).join(", ")}
          {prejuizo.length > 5 ? "..." : ""}.
        </div>
      )}

      {vazio ? (
        <div className="cartao mt-6">
          <Vazio>
            Nada por aqui ainda. Para começar, cadastre{" "}
            <Link href="/planos/novo" className="link">
              planos
            </Link>
            ,{" "}
            <Link href="/mestres/novo" className="link">
              mestres
            </Link>{" "}
            e{" "}
            <Link href="/mesas/novo" className="link">
              mesas
            </Link>
            , depois{" "}
            <Link href="/jogadores/novo" className="link">
              jogadores
            </Link>{" "}
            com suas assinaturas.
          </Vazio>
        </div>
      ) : (
        <div className="mt-6 grid gap-6">
          {porMestre.length > 0 && (
            <Secao titulo="Saída · por mestre">
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Mestre</th>
                    <th className="num hidden sm:table-cell">Mesas</th>
                    <th className="num">
                      <span className="sm:hidden">Previsto</span>
                      <span className="hidden sm:inline">Custo previsto/mês</span>
                    </th>
                    <th className="num hidden md:table-cell">Sessões no mês</th>
                    <th className="num hidden sm:table-cell">Valor no mês</th>
                    <th className="num">A pagar</th>
                  </tr>
                </thead>
                <tbody>
                  {porMestre.map((m) => (
                    <tr key={m.id}>
                      <td className="font-medium">
                        <Link href={`/mestres/${m.id}`} className="link">
                          {m.nome}
                        </Link>
                      </td>
                      <td className="num hidden sm:table-cell">{m.mesas}</td>
                      <td className="num">{formatarMoeda(m.custoPrevisto)}</td>
                      <td className="num hidden md:table-cell">{m.sessoes}</td>
                      <td className="num hidden sm:table-cell">{formatarMoeda(m.valorMes)}</td>
                      <td className={`num font-semibold ${m.aPagar > 0 ? "text-amber-700" : "text-slate-400"}`}>
                        {formatarMoeda(m.aPagar)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Secao>
          )}

          {porTipo.length > 0 && (
            <Secao titulo="Saída · por tipo de mesa">
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th className="num">Mesas ativas</th>
                    <th className="num">Vagas ocupadas</th>
                    <th className="num">
                      <span className="sm:hidden">Previsto</span>
                      <span className="hidden sm:inline">Custo previsto/mês</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {porTipo.map((t) => (
                    <tr key={t.nome}>
                      <td className="font-medium">{t.nome}</td>
                      <td className="num">{t.mesas}</td>
                      <td className="num">
                        {t.ocupadas}/{t.vagas}
                      </td>
                      <td className="num">{formatarMoeda(t.custo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Secao>
          )}

          {linhas.length > 0 && (
            <>
              <TabelaGrupo
                titulo="Entrada · por plataforma"
                grupos={porPlataforma}
                comTaxa
                campoTaxa="taxaPlataforma"
                rotuloTaxa="Taxa plataforma/mês"
              />
              <TabelaGrupo titulo="Entrada · por plano" grupos={porPlano} />
              <TabelaGrupo
                titulo="Entrada · por método de pagamento"
                grupos={porMetodo}
                comTaxa
                campoTaxa="taxaMetodo"
                rotuloTaxa="Taxa método/mês"
              />
            </>
          )}
        </div>
      )}
    </>
  );
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="cartao overflow-x-auto">
      <h2 className="px-4 pt-4 pb-3 text-sm font-semibold text-slate-900">{titulo}</h2>
      {children}
    </section>
  );
}

function TabelaGrupo({
  titulo,
  grupos,
  comTaxa,
  campoTaxa = "totalTaxas",
  rotuloTaxa = "Taxas/mês",
}: {
  titulo: string;
  grupos: Grupo[];
  comTaxa?: boolean;
  campoTaxa?: "totalTaxas" | "taxaPlataforma" | "taxaMetodo";
  rotuloTaxa?: string;
}) {
  return (
    <Secao titulo={titulo}>
      <table className="tabela">
        <thead>
          <tr>
            <th>Nome</th>
            {comTaxa && <th className="hidden md:table-cell">Taxa</th>}
            <th className="num">Ativas</th>
            <th className="num hidden sm:table-cell">Bruto/mês</th>
            <th className="num">
              <span className="sm:hidden">Taxa/mês</span>
              <span className="hidden sm:inline">{rotuloTaxa}</span>
            </th>
            <th className="num">Líquido/mês</th>
          </tr>
        </thead>
        <tbody>
          {grupos.map((g) => (
            <tr key={g.nome}>
              <td className="font-medium">{g.nome}</td>
              {comTaxa && <td className="hidden text-slate-500 md:table-cell">{g.detalhe}</td>}
              <td className="num">{g.quantidade}</td>
              <td className="num hidden sm:table-cell">{formatarMoeda(g.total.bruto)}</td>
              <td className="num text-slate-500">− {formatarMoeda(g.total[campoTaxa])}</td>
              <td className="num font-semibold text-emerald-700">{formatarMoeda(g.total.liquido)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Secao>
  );
}
