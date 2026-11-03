import Link from "next/link";
import { BotaoConfirmar, BotaoEnviar } from "@/components/botao-confirmar";
import { Cabecalho, SeloAtivo, Vazio } from "@/components/ui";
import { mesAtual, intervaloDoMes } from "@/lib/datas";
import { exigirGerente } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { formatarMoeda } from "@/lib/format";
import { alternarMestre } from "./actions";

export const metadata = { title: "Mestres · Gestão de Mesas" };

export default async function Page() {
  await exigirGerente();
  const { inicio, fim } = intervaloDoMes(mesAtual());
  const [mestres, mesasAtivas, sessoesMes, aReceber] = await Promise.all([
    prisma.mestre.findMany({
      orderBy: [{ ativo: "desc" }, { nome: "asc" }],
      select: { id: true, nome: true, email: true, telefone: true, ativo: true },
    }),
    prisma.mesa.groupBy({ by: ["mestreId"], where: { ativo: true, mestreId: { not: null } }, _count: true }),
    prisma.sessao.groupBy({ by: ["mestreId"], where: { data: { gte: inicio, lt: fim } }, _count: true }),
    prisma.sessao.groupBy({ by: ["mestreId"], where: { pagoEm: null }, _sum: { valorCentavos: true } }),
  ]);
  const mesas = new Map(mesasAtivas.map((g) => [g.mestreId, g._count]));
  const sessoes = new Map(sessoesMes.map((g) => [g.mestreId, g._count]));
  const pendente = new Map(aReceber.map((g) => [g.mestreId, g._sum.valorCentavos ?? 0]));

  return (
    <>
      <Cabecalho
        titulo="Mestres"
        descricao="Quem conduz as mesas. Cada mestre acessa o próprio painel para registrar sessões."
        acoes={
          <Link href="/mestres/novo" className="btn-primario">
            + Novo mestre
          </Link>
        }
      />
      <div className="cartao overflow-x-auto">
        {mestres.length === 0 ? (
          <Vazio>
            Nenhum mestre ainda.{" "}
            <Link href="/mestres/novo" className="link">
              Cadastre o primeiro
            </Link>
            .
          </Vazio>
        ) : (
          <table className="tabela">
            <thead>
              <tr>
                <th>Mestre</th>
                <th>Telefone</th>
                <th className="num">Mesas ativas</th>
                <th className="num">Sessões no mês</th>
                <th className="num">A receber</th>
                <th>Status</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {mestres.map((m) => {
                const valorPendente = pendente.get(m.id) ?? 0;
                return (
                  <tr key={m.id} className={m.ativo ? "" : "text-slate-400"}>
                    <td>
                      <Link href={`/mestres/${m.id}`} className="link">
                        {m.nome}
                      </Link>
                      <p className="text-xs text-slate-500">{m.email}</p>
                    </td>
                    <td>{m.telefone ?? "—"}</td>
                    <td className="num">
                      <Link href={`/mesas?mestreId=${m.id}`} className="link">
                        {mesas.get(m.id) ?? 0}
                      </Link>
                    </td>
                    <td className="num">{sessoes.get(m.id) ?? 0}</td>
                    <td className={`num ${valorPendente > 0 ? "font-semibold text-amber-700" : ""}`}>
                      {valorPendente > 0 ? (
                        <Link href={`/sessoes?mestreId=${m.id}&status=a-receber`} className="hover:underline">
                          {formatarMoeda(valorPendente)}
                        </Link>
                      ) : (
                        formatarMoeda(0)
                      )}
                    </td>
                    <td>
                      <SeloAtivo ativo={m.ativo} />
                    </td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <Link href={`/mestres/${m.id}`} className="btn-secundario">
                          Editar
                        </Link>
                        <form action={alternarMestre.bind(null, m.id)}>
                          {m.ativo ? (
                            <BotaoConfirmar
                              className="btn-secundario"
                              confirmacao={`Desativar ${m.nome}? O mestre perde o acesso ao painel imediatamente.`}
                            >
                              Desativar
                            </BotaoConfirmar>
                          ) : (
                            <BotaoEnviar className="btn-secundario" pendente="...">
                              Ativar
                            </BotaoEnviar>
                          )}
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <p className="mt-3 text-xs text-slate-500">
        &ldquo;A receber&rdquo; soma todas as sessões ainda não pagas, de qualquer mês.
      </p>
    </>
  );
}
