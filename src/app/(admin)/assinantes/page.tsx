import Link from "next/link";
import { Cabecalho, SeloStatus, Vazio } from "@/components/ui";
import type { Prisma } from "@/generated/prisma/client";
import { financeiroDoAssinante, somar } from "@/lib/assinantes";
import { exigirGerente } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { formatarData, formatarMoeda } from "@/lib/format";
import { STATUS, sufixoPeriodicidade, type Status } from "@/lib/labels";

export const metadata = { title: "Assinantes · Gestão de Assinaturas" };

function texto(v: string | string[] | undefined) {
  return typeof v === "string" ? v.trim() : "";
}
function idOuNada(v: string) {
  const n = Number(v);
  return v && Number.isSafeInteger(n) && n > 0 ? n : undefined;
}

export default async function Page(props: PageProps<"/assinantes">) {
  await exigirGerente();
  const sp = await props.searchParams;
  const filtro = {
    q: texto(sp.q),
    status: texto(sp.status),
    planoId: texto(sp.planoId),
    plataformaId: texto(sp.plataformaId),
    metodoPagamentoId: texto(sp.metodoPagamentoId),
  };

  const where: Prisma.AssinanteWhereInput = {
    status: STATUS.some((s) => s.valor === filtro.status) ? (filtro.status as Status) : undefined,
    planoId: idOuNada(filtro.planoId),
    plataformaId: idOuNada(filtro.plataformaId),
    metodoPagamentoId: idOuNada(filtro.metodoPagamentoId),
    OR: filtro.q
      ? [
          { nome: { contains: filtro.q, mode: "insensitive" } },
          { email: { contains: filtro.q, mode: "insensitive" } },
        ]
      : undefined,
  };

  const [assinantes, planos, plataformas, metodos] = await Promise.all([
    prisma.assinante.findMany({
      where,
      include: { plano: true, plataforma: true, metodoPagamento: true },
      orderBy: [{ status: "asc" }, { nome: "asc" }],
    }),
    prisma.plano.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
    prisma.plataforma.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
    prisma.metodoPagamento.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
  ]);

  const linhas = assinantes.map((a) => ({ ...a, fin: financeiroDoAssinante(a) }));
  const ativos = linhas.filter((l) => l.status === "ATIVO");
  const totalMensal = somar(ativos.map((l) => l.fin.mensal));
  const temFiltro = Object.values(filtro).some(Boolean);

  return (
    <>
      <Cabecalho
        titulo="Assinantes"
        descricao="Valores por cobrança, já descontadas as taxas da plataforma e do método de pagamento."
        acoes={
          <Link href="/assinantes/novo" className="btn-primario">
            + Novo assinante
          </Link>
        }
      />

      <form method="get" className="cartao mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[1.5fr_repeat(4,1fr)_auto]">
        <input name="q" defaultValue={filtro.q} placeholder="Buscar por nome ou e-mail" className="input" aria-label="Buscar" />
        <select name="status" defaultValue={filtro.status} className="input" aria-label="Status">
          <option value="">Todos os status</option>
          {STATUS.map((s) => (
            <option key={s.valor} value={s.valor}>
              {s.rotulo}
            </option>
          ))}
        </select>
        <Filtro nome="planoId" vazio="Todos os planos" valor={filtro.planoId} opcoes={planos} />
        <Filtro nome="plataformaId" vazio="Todas as plataformas" valor={filtro.plataformaId} opcoes={plataformas} />
        <Filtro nome="metodoPagamentoId" vazio="Todos os métodos" valor={filtro.metodoPagamentoId} opcoes={metodos} />
        <div className="flex gap-2">
          <button type="submit" className="btn-secundario">
            Filtrar
          </button>
          {temFiltro && (
            <Link href="/assinantes" className="btn-secundario">
              Limpar
            </Link>
          )}
        </div>
      </form>

      <div className="cartao overflow-x-auto">
        {linhas.length === 0 ? (
          <Vazio>
            {temFiltro ? (
              "Nenhum assinante encontrado com esses filtros."
            ) : (
              <>
                Nenhum assinante ainda.{" "}
                <Link href="/assinantes/novo" className="link">
                  Cadastre o primeiro
                </Link>
                .
              </>
            )}
          </Vazio>
        ) : (
          <table className="tabela">
            <thead>
              <tr>
                <th>Assinante</th>
                <th>Plano</th>
                <th>Plataforma</th>
                <th>Pagamento</th>
                <th className="num">Bruto</th>
                <th className="num">Taxas</th>
                <th className="num">Líquido</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((a) => (
                <tr key={a.id} className={a.status === "CANCELADO" ? "text-slate-400" : ""}>
                  <td>
                    <Link href={`/assinantes/${a.id}`} className="link">
                      {a.nome}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {a.email} · desde {formatarData(a.dataInicio)}
                    </p>
                  </td>
                  <td>{a.plano.nome}</td>
                  <td>{a.plataforma.nome}</td>
                  <td>{a.metodoPagamento.nome}</td>
                  <td className="num">
                    {formatarMoeda(a.fin.porCobranca.bruto)}
                    <span className="text-xs text-slate-400">{sufixoPeriodicidade(a.plano.periodicidade)}</span>
                  </td>
                  <td className="num text-slate-500">− {formatarMoeda(a.fin.porCobranca.totalTaxas)}</td>
                  <td className={`num font-semibold ${a.fin.porCobranca.liquido > 0 ? "text-emerald-700" : "text-red-600"}`}>
                    {formatarMoeda(a.fin.porCobranca.liquido)}
                  </td>
                  <td>
                    <SeloStatus status={a.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {linhas.length > 0 && (
        <p className="mt-3 text-sm text-slate-600">
          {linhas.length} assinante{linhas.length === 1 ? "" : "s"} na lista, {ativos.length} ativo
          {ativos.length === 1 ? "" : "s"}. Equivalente mensal dos ativos: bruto{" "}
          <strong>{formatarMoeda(totalMensal.bruto)}</strong>, taxas <strong>{formatarMoeda(totalMensal.totalTaxas)}</strong>,
          líquido <strong className="text-emerald-700">{formatarMoeda(totalMensal.liquido)}</strong>.
        </p>
      )}
    </>
  );
}

function Filtro({
  nome,
  vazio,
  valor,
  opcoes,
}: {
  nome: string;
  vazio: string;
  valor: string;
  opcoes: { id: number; nome: string }[];
}) {
  return (
    <select name={nome} defaultValue={valor} className="input" aria-label={vazio}>
      <option value="">{vazio}</option>
      {opcoes.map((o) => (
        <option key={o.id} value={o.id}>
          {o.nome}
        </option>
      ))}
    </select>
  );
}
