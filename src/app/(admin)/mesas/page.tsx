import Link from "next/link";
import { BotaoEnviar } from "@/components/botao-confirmar";
import { Cabecalho, Selo, SeloAtivo, Vazio } from "@/components/ui";
import type { Prisma } from "@/generated/prisma/client";
import { exigirGerente } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { custoMensalPrevistoDaMesa, valorSessaoDaMesa } from "@/lib/finance";
import { formatarMoeda } from "@/lib/format";
import { alternarMesa } from "./actions";
import { AvisoSemTipo } from "./aviso-sem-tipo";
import { ocupacaoPorMesa } from "./opcoes";

export const metadata = { title: "Mesas · Gestão de Mesas" };

function idOuNada(v: string | string[] | undefined) {
  const n = Number(v);
  return typeof v === "string" && v && Number.isSafeInteger(n) && n > 0 ? n : undefined;
}

export default async function Page(props: PageProps<"/mesas">) {
  await exigirGerente();
  const sp = await props.searchParams;
  const tipoMesaId = idOuNada(sp.tipoMesaId);
  const semMestre = sp.mestreId === "nenhum";
  const mestreId = idOuNada(sp.mestreId);

  const where: Prisma.MesaWhereInput = {
    tipoMesaId,
    mestreId: semMestre ? null : mestreId,
  };

  const [mesas, tipos, mestres] = await Promise.all([
    prisma.mesa.findMany({
      where,
      include: { tipoMesa: true, mestre: { select: { id: true, nome: true, ativo: true } } },
      orderBy: [{ ativo: "desc" }, { nome: "asc" }],
    }),
    prisma.tipoMesa.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
    prisma.mestre.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
  ]);
  const ocupacao = await ocupacaoPorMesa(mesas.map((m) => m.id));
  const temFiltro = !!(tipoMesaId || mestreId || semMestre);
  const custoTotal = mesas
    .filter((m) => m.ativo)
    .reduce((t, m) => t + custoMensalPrevistoDaMesa(m, m.tipoMesa), 0);

  return (
    <>
      <Cabecalho
        titulo="Mesas"
        descricao="Cada mesa tem um tipo, um mestre e vários jogadores. O mestre recebe por sessão conduzida."
        acoes={
          <Link href="/mesas/novo" className="btn-primario">
            + Nova mesa
          </Link>
        }
      />
      {tipos.length === 0 && <AvisoSemTipo />}

      <form method="get" className="cartao mb-4 grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto]">
        <select name="tipoMesaId" defaultValue={tipoMesaId ?? ""} className="input" aria-label="Tipo de mesa">
          <option value="">Todos os tipos</option>
          {tipos.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nome}
            </option>
          ))}
        </select>
        <select
          name="mestreId"
          defaultValue={semMestre ? "nenhum" : (mestreId ?? "")}
          className="input"
          aria-label="Mestre"
        >
          <option value="">Todos os mestres</option>
          <option value="nenhum">Sem mestre</option>
          {mestres.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nome}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <button type="submit" className="btn-secundario">
            Filtrar
          </button>
          {temFiltro && (
            <Link href="/mesas" className="btn-secundario">
              Limpar
            </Link>
          )}
        </div>
      </form>

      <div className="cartao overflow-x-auto">
        {mesas.length === 0 ? (
          <Vazio>
            {temFiltro ? (
              "Nenhuma mesa encontrada com esses filtros."
            ) : (
              <>
                Nenhuma mesa ainda.{" "}
                <Link href="/mesas/novo" className="link">
                  Crie a primeira
                </Link>
                .
              </>
            )}
          </Vazio>
        ) : (
          <table className="tabela">
            <thead>
              <tr>
                <th>Mesa</th>
                <th>Tipo</th>
                <th>Mestre</th>
                <th className="num">Jogadores</th>
                <th className="num">Valor/sessão</th>
                <th className="num">Sessões/mês</th>
                <th className="num">Custo previsto/mês</th>
                <th>Status</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {mesas.map((m) => {
                const ocupados = ocupacao.get(m.id) ?? 0;
                const cheia = ocupados >= m.capacidade;
                return (
                  <tr key={m.id} className={m.ativo ? "" : "text-slate-400"}>
                    <td>
                      <Link href={`/mesas/${m.id}`} className="link">
                        {m.nome}
                      </Link>
                    </td>
                    <td>{m.tipoMesa.nome}</td>
                    <td>
                      {m.mestre ? (
                        <>
                          {m.mestre.nome}
                          {!m.mestre.ativo && <span className="text-xs text-slate-400"> (inativo)</span>}
                        </>
                      ) : (
                        <Selo cor="amarelo">Sem mestre</Selo>
                      )}
                    </td>
                    <td className={`num ${cheia ? "font-semibold text-amber-700" : ""}`}>
                      {ocupados}/{m.capacidade}
                    </td>
                    <td className="num">
                      {formatarMoeda(valorSessaoDaMesa(m, m.tipoMesa))}
                      <p className="text-xs text-slate-400">
                        {m.valorSessaoCentavos === null ? "padrão do tipo" : "personalizado"}
                      </p>
                    </td>
                    <td className="num">{m.sessoesPorMes}</td>
                    <td className="num">{formatarMoeda(custoMensalPrevistoDaMesa(m, m.tipoMesa))}</td>
                    <td>
                      <SeloAtivo ativo={m.ativo} />
                    </td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <Link href={`/mesas/${m.id}`} className="btn-secundario">
                          Editar
                        </Link>
                        <form action={alternarMesa.bind(null, m.id)}>
                          <BotaoEnviar className="btn-secundario" pendente="...">
                            {m.ativo ? "Desativar" : "Ativar"}
                          </BotaoEnviar>
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
      {mesas.length > 0 && (
        <p className="mt-3 text-sm text-slate-600">
          Custo previsto com mestres das mesas ativas listadas:{" "}
          <strong>{formatarMoeda(custoTotal)}</strong> por mês.
        </p>
      )}
    </>
  );
}
