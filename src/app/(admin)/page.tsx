import Link from "next/link";
import { Cabecalho, Vazio } from "@/components/ui";
import { financeiroDoAssinante, somar } from "@/lib/assinantes";
import { exigirGerente } from "@/lib/dal";
import { prisma } from "@/lib/db";
import type { ResultadoLiquido } from "@/lib/finance";
import { descreverTaxa, formatarMoeda } from "@/lib/format";

export const metadata = { title: "Visão geral · Gestão de Assinaturas" };

type Grupo = { nome: string; detalhe?: string; quantidade: number; total: ResultadoLiquido };

function agrupar<T>(itens: T[], chave: (t: T) => string, mensal: (t: T) => ResultadoLiquido, detalhe?: (t: T) => string) {
  const mapa = new Map<string, { itens: T[] }>();
  for (const i of itens) {
    const k = chave(i);
    if (!mapa.has(k)) mapa.set(k, { itens: [] });
    mapa.get(k)!.itens.push(i);
  }
  return [...mapa.entries()]
    .map(
      ([nome, g]): Grupo => ({
        nome,
        detalhe: detalhe?.(g.itens[0]),
        quantidade: g.itens.length,
        total: somar(g.itens.map(mensal)),
      }),
    )
    .sort((a, b) => b.total.bruto - a.total.bruto);
}

export default async function Page() {
  await exigirGerente();
  const [ativos, contagem] = await Promise.all([
    prisma.assinante.findMany({
      where: { status: "ATIVO" },
      include: { plano: true, plataforma: true, metodoPagamento: true },
    }),
    prisma.assinante.groupBy({ by: ["status"], _count: true }),
  ]);
  const porStatus = Object.fromEntries(contagem.map((c) => [c.status, c._count])) as Record<string, number>;

  const linhas = ativos.map((a) => ({ ...a, fin: financeiroDoAssinante(a) }));
  const total = somar(linhas.map((l) => l.fin.mensal));
  const prejuizo = linhas.filter((l) => l.fin.porCobranca.liquido <= 0);

  const porPlataforma = agrupar(
    linhas,
    (l) => l.plataforma.nome,
    (l) => l.fin.mensal,
    (l) => descreverTaxa(l.plataforma),
  );
  const porPlano = agrupar(
    linhas,
    (l) => l.plano.nome,
    (l) => l.fin.mensal,
  );
  const porMetodo = agrupar(
    linhas,
    (l) => l.metodoPagamento.nome,
    (l) => l.fin.mensal,
    (l) => descreverTaxa(l.metodoPagamento),
  );

  return (
    <>
      <Cabecalho
        titulo="Visão geral"
        descricao="Receita mensal equivalente dos assinantes ativos (planos trimestrais, semestrais e anuais divididos por mês)."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Indicador rotulo="Assinantes ativos" valor={String(linhas.length)}>
          {(porStatus.INADIMPLENTE ?? 0) > 0 && (
            <Link href="/assinantes?status=INADIMPLENTE" className="text-amber-700 hover:underline">
              {porStatus.INADIMPLENTE} inadimplente{porStatus.INADIMPLENTE === 1 ? "" : "s"}
            </Link>
          )}
        </Indicador>
        <Indicador rotulo="Receita bruta / mês" valor={formatarMoeda(total.bruto)} />
        <Indicador rotulo="Taxas / mês" valor={`− ${formatarMoeda(total.totalTaxas)}`}>
          {total.bruto > 0 && (
            <>
              {((total.totalTaxas / total.bruto) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% da receita
            </>
          )}
        </Indicador>
        <Indicador rotulo="Receita líquida / mês" valor={formatarMoeda(total.liquido)} destaque />
      </div>

      {prejuizo.length > 0 && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {prejuizo.length} assinante{prejuizo.length === 1 ? " tem" : "s têm"} valor líquido zero ou negativo (as taxas
          superam o valor do plano): {prejuizo.slice(0, 5).map((p) => p.nome).join(", ")}
          {prejuizo.length > 5 ? "..." : ""}.
        </div>
      )}

      {linhas.length === 0 ? (
        <div className="cartao mt-6">
          <Vazio>
            Nenhum assinante ativo ainda. Comece criando{" "}
            <Link href="/planos/novo" className="link">
              planos
            </Link>
            ,{" "}
            <Link href="/plataformas" className="link">
              plataformas
            </Link>{" "}
            e{" "}
            <Link href="/metodos-pagamento" className="link">
              métodos de pagamento
            </Link>
            , depois{" "}
            <Link href="/assinantes/novo" className="link">
              cadastre assinantes
            </Link>
            .
          </Vazio>
        </div>
      ) : (
        <div className="mt-6 grid gap-6">
          <TabelaGrupo titulo="Por plataforma" grupos={porPlataforma} comTaxa campoTaxa="taxaPlataforma" rotuloTaxa="Taxa plataforma/mês" />
          <TabelaGrupo titulo="Por plano" grupos={porPlano} />
          <TabelaGrupo titulo="Por método de pagamento" grupos={porMetodo} comTaxa campoTaxa="taxaMetodo" rotuloTaxa="Taxa método/mês" />
        </div>
      )}
    </>
  );
}

function Indicador({
  rotulo,
  valor,
  destaque,
  children,
}: {
  rotulo: string;
  valor: string;
  destaque?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="cartao p-5">
      <p className="text-sm text-slate-500">{rotulo}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${destaque ? "text-emerald-700" : "text-slate-900"}`}>
        {valor}
      </p>
      {children && <p className="mt-1 text-xs text-slate-500">{children}</p>}
    </div>
  );
}

function TabelaGrupo({
  titulo,
  grupos,
  comTaxa,
  campoTaxa = "totalTaxas",
  rotuloTaxa = "Taxas/mês",
  className,
}: {
  titulo: string;
  grupos: Grupo[];
  comTaxa?: boolean;
  campoTaxa?: "totalTaxas" | "taxaPlataforma" | "taxaMetodo";
  rotuloTaxa?: string;
  className?: string;
}) {
  return (
    <section className={`cartao overflow-x-auto ${className ?? ""}`}>
      <h2 className="px-4 pt-4 pb-3 text-sm font-semibold text-slate-900">{titulo}</h2>
      <table className="tabela">
        <thead>
          <tr>
            <th>Nome</th>
            {comTaxa && <th className="hidden md:table-cell">Taxa</th>}
            <th className="num">Ativos</th>
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
    </section>
  );
}
