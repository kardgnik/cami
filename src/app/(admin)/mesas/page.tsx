import Link from "next/link";
import { BotaoEnviar } from "@/components/botao-confirmar";
import { Cabecalho, Selo, SeloAtivo, Vazio } from "@/components/ui";
import type { Prisma } from "@/generated/prisma/client";
import { exigirGerente } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { custoMensalPrevistoDaMesa, vagasDaMesa, valorAlunoDaMesa, valorSessaoDaMesa } from "@/lib/finance";
import { formatarMoeda } from "@/lib/format";
import { DIAS_SEMANA, rotuloDia, type DiaSemana } from "@/lib/labels";
import { situacaoDasMesas } from "@/lib/mesas";
import { alternarMesa } from "./actions";
import { AvisoSemTipo } from "./aviso-sem-tipo";

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
  const diaSemana = DIAS_SEMANA.find((d) => d.valor === sp.diaSemana)?.valor as DiaSemana | undefined;
  const vagas = sp.vagas === "com" || sp.vagas === "sem" ? sp.vagas : "";

  const where: Prisma.MesaWhereInput = {
    tipoMesaId,
    mestreId: semMestre ? null : mestreId,
    diaSemana,
    // "com vagas" só faz sentido para mesas em uso
    ativo: vagas === "com" ? true : undefined,
  };

  const [todas, tipos, mestres] = await Promise.all([
    prisma.mesa.findMany({
      where,
      include: { tipoMesa: true, mestre: { select: { id: true, nome: true, ativo: true } } },
      orderBy: [{ ativo: "desc" }, { nome: "asc" }],
    }),
    prisma.tipoMesa.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
    prisma.mestre.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
  ]);
  const situacao = await situacaoDasMesas({ mesaIds: todas.map((m) => m.id) });
  const mesas = todas
    .map((m) => {
      const { ocupacao, fechada } = situacao.de(m.id);
      return {
        ...m,
        ocupacao,
        fechada,
        vagas: vagasDaMesa(m.capacidade, ocupacao, fechada),
        porAluno: m.tipoMesa.pagamentoMestre === "POR_ALUNO",
        custo: custoMensalPrevistoDaMesa(m, m.tipoMesa, ocupacao),
      };
    })
    .filter((m) => (vagas === "com" ? m.vagas > 0 : vagas === "sem" ? m.vagas === 0 : true));
  const temFiltro = !!(tipoMesaId || mestreId || semMestre || diaSemana || vagas);
  const custoTotal = mesas.filter((m) => m.ativo).reduce((t, m) => t + m.custo, 0);
  const vagasTotal = mesas.filter((m) => m.ativo).reduce((t, m) => t + m.vagas, 0);

  return (
    <>
      <Cabecalho
        titulo="Mesas"
        descricao="Cada mesa tem um tipo, um mestre e vários jogadores. O mestre recebe por sessão ou por aluno, conforme o tipo da mesa."
        acoes={
          <Link href="/mesas/novo" className="btn-primario">
            + Nova mesa
          </Link>
        }
      />
      {tipos.length === 0 && <AvisoSemTipo />}

      <form method="get" className="cartao mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[repeat(4,1fr)_auto]">
        <select name="vagas" defaultValue={vagas} className="input" aria-label="Vagas">
          <option value="">Com ou sem vagas</option>
          <option value="com">Só com vagas</option>
          <option value="sem">Só sem vagas</option>
        </select>
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
        <select name="diaSemana" defaultValue={diaSemana ?? ""} className="input" aria-label="Dia da semana">
          <option value="">Todos os dias</option>
          {DIAS_SEMANA.map((d) => (
            <option key={d.valor} value={d.valor}>
              {d.rotulo}
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
                <th>Dia</th>
                <th>Mestre</th>
                <th className="num">Jogadores</th>
                <th className="num">Mestre recebe</th>
                <th className="num">Previsto/mês</th>
                <th>Status</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {mesas.map((m) => {
                return (
                  <tr key={m.id} className={m.ativo ? "" : "text-slate-400"}>
                    <td>
                      <Link href={`/mesas/${m.id}`} className="link">
                        {m.nome}
                      </Link>
                    </td>
                    <td>{m.tipoMesa.nome}</td>
                    <td className="whitespace-nowrap">{rotuloDia(m.diaSemana, true) ?? <span className="text-slate-400">—</span>}</td>
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
                    <td className="num">
                      {m.ocupacao}/{m.capacidade}
                      <p className="text-xs">
                        {m.fechada ? (
                          <span className="text-slate-500">Grupo fechado</span>
                        ) : m.vagas > 0 ? (
                          <span className="font-medium text-emerald-700">
                            {m.vagas} vaga{m.vagas === 1 ? "" : "s"}
                          </span>
                        ) : (
                          <span className="font-medium text-amber-700">Lotada</span>
                        )}
                      </p>
                    </td>
                    <td className="num">
                      {m.porAluno ? (
                        <>
                          {formatarMoeda(valorAlunoDaMesa(m, m.tipoMesa))}
                          <p className="text-xs text-slate-400">
                            por aluno/mês · {m.valorAlunoCentavos === null ? "padrão do tipo" : "personalizado"}
                          </p>
                        </>
                      ) : (
                        <>
                          {formatarMoeda(valorSessaoDaMesa(m, m.tipoMesa))}
                          <p className="text-xs text-slate-400">
                            por sessão × {m.sessoesPorMes}/mês · {m.valorSessaoCentavos === null ? "padrão do tipo" : "personalizado"}
                          </p>
                        </>
                      )}
                    </td>
                    <td className="num">{formatarMoeda(m.custo)}</td>
                    <td>
                      <SeloAtivo ativo={m.ativo} />
                    </td>
                    <td>
                      <div className="flex flex-wrap justify-end gap-2">
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
          {mesas.length} mesa{mesas.length === 1 ? "" : "s"} na lista, com <strong>{vagasTotal}</strong> vaga
          {vagasTotal === 1 ? "" : "s"} nas ativas. Custo previsto com mestres das mesas ativas listadas:{" "}
          <strong>{formatarMoeda(custoTotal)}</strong> por mês.
        </p>
      )}
    </>
  );
}
