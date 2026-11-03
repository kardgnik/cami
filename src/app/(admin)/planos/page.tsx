import Link from "next/link";
import { BotaoEnviar } from "@/components/botao-confirmar";
import { Cabecalho, SeloAtivo, Vazio } from "@/components/ui";
import { exigirGerente } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { formatarMoeda } from "@/lib/format";
import { rotuloPeriodicidade, sufixoPeriodicidade } from "@/lib/labels";
import { alternarPlano } from "./actions";

export const metadata = { title: "Planos · Gestão de Assinaturas" };

export default async function Page() {
  await exigirGerente();
  const [planos, ativosPorPlano] = await Promise.all([
    prisma.plano.findMany({ orderBy: [{ ativo: "desc" }, { valorCentavos: "asc" }] }),
    prisma.assinatura.groupBy({ by: ["planoId"], where: { status: "ATIVO" }, _count: true }),
  ]);
  const ativos = new Map(ativosPorPlano.map((g) => [g.planoId, g._count]));

  return (
    <>
      <Cabecalho
        titulo="Planos"
        descricao="Os planos que a empresa oferece e quanto custa cada cobrança."
        acoes={
          <Link href="/planos/novo" className="btn-primario">
            + Novo plano
          </Link>
        }
      />
      <div className="cartao overflow-x-auto">
        {planos.length === 0 ? (
          <Vazio>
            Nenhum plano ainda.{" "}
            <Link href="/planos/novo" className="link">
              Crie o primeiro
            </Link>
            .
          </Vazio>
        ) : (
          <table className="tabela">
            <thead>
              <tr>
                <th>Plano</th>
                <th className="num">Valor</th>
                <th>Periodicidade</th>
                <th className="num">Mesas</th>
                <th className="num">Assinaturas ativas</th>
                <th>Status</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {planos.map((p) => (
                <tr key={p.id} className={p.ativo ? "" : "text-slate-400"}>
                  <td>
                    <p className="font-medium">{p.nome}</p>
                    {p.descricao && <p className="max-w-sm truncate text-xs text-slate-500">{p.descricao}</p>}
                  </td>
                  <td className="num">
                    {formatarMoeda(p.valorCentavos)}
                    <span className="text-xs text-slate-400">{sufixoPeriodicidade(p.periodicidade)}</span>
                  </td>
                  <td>{rotuloPeriodicidade(p.periodicidade)}</td>
                  <td className="num">{p.limiteMesas}</td>
                  <td className="num">{ativos.get(p.id) ?? 0}</td>
                  <td>
                    <SeloAtivo ativo={p.ativo} />
                  </td>
                  <td>
                    <div className="flex justify-end gap-2">
                      <Link href={`/planos/${p.id}`} className="btn-secundario">
                        Editar
                      </Link>
                      <form action={alternarPlano.bind(null, p.id)}>
                        <BotaoEnviar className="btn-secundario" pendente="...">
                          {p.ativo ? "Desativar" : "Ativar"}
                        </BotaoEnviar>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Alterar o valor de um plano atualiza o valor de todas as assinaturas vinculadas a ele.
      </p>
    </>
  );
}
