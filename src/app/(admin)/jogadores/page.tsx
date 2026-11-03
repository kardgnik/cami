import Link from "next/link";
import { Cabecalho, Selo, SeloStatus, Vazio } from "@/components/ui";
import type { Prisma } from "@/generated/prisma/client";
import { financeiroDaAssinatura, somar } from "@/lib/assinaturas";
import { exigirGerente } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { formatarMoeda } from "@/lib/format";
import { STATUS, type Status } from "@/lib/labels";

export const metadata = { title: "Jogadores · Gestão de Mesas" };

function texto(v: string | string[] | undefined) {
  return typeof v === "string" ? v.trim() : "";
}

/** O "melhor" status entre as assinaturas: Ativo > Inadimplente > Cancelado. */
function statusResumo(statuses: Status[]): Status | null {
  if (statuses.includes("ATIVO")) return "ATIVO";
  if (statuses.includes("INADIMPLENTE")) return "INADIMPLENTE";
  if (statuses.includes("CANCELADO")) return "CANCELADO";
  return null;
}

export default async function Page(props: PageProps<"/jogadores">) {
  await exigirGerente();
  const sp = await props.searchParams;
  const q = texto(sp.q);
  const statusTexto = texto(sp.status);
  const status = STATUS.some((s) => s.valor === statusTexto) ? (statusTexto as Status) : undefined;

  const where: Prisma.JogadorWhereInput = {
    assinaturas: status ? { some: { status } } : undefined,
    OR: q
      ? [
          { nome: { contains: q, mode: "insensitive" } },
          { telefone: { contains: q } },
          { email: { contains: q, mode: "insensitive" } },
        ]
      : undefined,
  };

  const jogadores = await prisma.jogador.findMany({
    where,
    orderBy: { nome: "asc" },
    include: {
      assinaturas: {
        include: {
          plano: true,
          plataforma: true,
          metodoPagamento: true,
          mesas: { include: { mesa: { select: { id: true, nome: true } } } },
        },
      },
    },
  });

  const linhas = jogadores.map((j) => {
    const ativas = j.assinaturas.filter((a) => a.status === "ATIVO");
    const mesas = new Map<number, string>();
    for (const a of j.assinaturas) {
      if (a.status === "CANCELADO") continue;
      for (const v of a.mesas) mesas.set(v.mesa.id, v.mesa.nome);
    }
    return {
      ...j,
      ativas: ativas.length,
      mesas: [...mesas.values()].sort((a, b) => a.localeCompare(b, "pt-BR")),
      liquidoMensal: somar(ativas.map((a) => financeiroDaAssinatura(a).mensal)).liquido,
      status: statusResumo(j.assinaturas.map((a) => a.status)),
    };
  });

  const totalAtivas = linhas.reduce((t, l) => t + l.ativas, 0);
  const totalLiquido = linhas.reduce((t, l) => t + l.liquidoMensal, 0);
  const temFiltro = Boolean(q || status);

  return (
    <>
      <Cabecalho
        titulo="Jogadores"
        descricao="Quem joga nas mesas. Cada jogador pode ter uma ou mais assinaturas, e cada assinatura cobre as mesas do plano."
        acoes={
          <Link href="/jogadores/novo" className="btn-primario">
            + Novo jogador
          </Link>
        }
      />

      <form method="get" className="cartao mb-4 grid gap-3 p-4 sm:grid-cols-[1fr_14rem_auto]">
        <input name="q" defaultValue={q} placeholder="Buscar por nome, telefone ou e-mail" className="input" aria-label="Buscar" />
        <select name="status" defaultValue={status ?? ""} className="input" aria-label="Status da assinatura">
          <option value="">Todos os status</option>
          {STATUS.map((s) => (
            <option key={s.valor} value={s.valor}>
              Com assinatura {s.rotulo.toLowerCase()}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <button type="submit" className="btn-secundario">
            Filtrar
          </button>
          {temFiltro && (
            <Link href="/jogadores" className="btn-secundario">
              Limpar
            </Link>
          )}
        </div>
      </form>

      <div className="cartao overflow-x-auto">
        {linhas.length === 0 ? (
          <Vazio>
            {temFiltro ? (
              "Nenhum jogador encontrado com esses filtros."
            ) : (
              <>
                Nenhum jogador ainda.{" "}
                <Link href="/jogadores/novo" className="link">
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
                <th>Jogador</th>
                <th>Mesas</th>
                <th className="num">Assinaturas ativas</th>
                <th className="num">Líquido/mês</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((j) => (
                <tr key={j.id} className={j.status === "CANCELADO" || j.status === null ? "text-slate-500" : ""}>
                  <td>
                    <Link href={`/jogadores/${j.id}`} className="link">
                      {j.nome}
                    </Link>
                    <p className="text-xs text-slate-500">{[j.telefone, j.email].filter(Boolean).join(" · ") || "sem telefone"}</p>
                  </td>
                  <td className="max-w-xs">{j.mesas.length ? j.mesas.join(", ") : <span className="text-slate-400">—</span>}</td>
                  <td className="num">{j.ativas}</td>
                  <td className={`num ${j.liquidoMensal > 0 ? "font-semibold text-emerald-700" : ""}`}>
                    {formatarMoeda(j.liquidoMensal)}
                  </td>
                  <td>{j.status ? <SeloStatus status={j.status} /> : <Selo cor="cinza">Sem assinatura</Selo>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {linhas.length > 0 && (
        <p className="mt-3 text-sm text-slate-600">
          {linhas.length} jogador{linhas.length === 1 ? "" : "es"} na lista, {totalAtivas} assinatura
          {totalAtivas === 1 ? "" : "s"} ativa{totalAtivas === 1 ? "" : "s"}. Líquido mensal das ativas:{" "}
          <strong className="text-emerald-700">{formatarMoeda(totalLiquido)}</strong>.
        </p>
      )}
    </>
  );
}
