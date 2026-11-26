import "server-only";
import { hojeISO, intervaloDoMes, mesAtual } from "./datas";
import { prisma } from "./db";
import { mensalidadeDaMesa, valorAlunoDaMesa, valorDaSessao, valorSessaoDaMesa, type TipoSessao } from "./finance";
import { mesasDoMestre, mestresDaMesa, situacaoDasMesas } from "./mesas";
import { formatarData, formatarMoeda } from "./format";
import { nomeDaSessao, rotuloTipoSessao } from "./labels";
import { erroDeUnicidade, type EstadoForm } from "./validations";

export type DadosNovaSessao = {
  tipo: TipoSessao;
  mesaId: number | null;
  nomeOneshot: string | null;
  data: Date;
  dataReferencia: Date | null;
  observacoes: string | null;
};

const SESSAO_DUPLICADA = "Esta mesa já tem sessão registrada nesta data.";

/** Valor padrão da oneshot (Configuracao id=1; R$ 35,00 se ainda não existir). */
export async function valorOneshot(): Promise<number> {
  const c = await prisma.configuracao.findUnique({ where: { id: 1 } });
  return c?.valorOneshotCentavos ?? 3_500;
}

/**
 * Registra uma sessão aplicando as regras comuns ao mestre e ao gerente:
 * datas não podem ser futuras, a mesa (se houver) precisa estar ativa e, quando
 * `mesaDoMestre` for verdadeiro, pertencer ao mestre; o valor é calculado pelo tipo
 * e gravado na sessão.
 *
 * Mesa com dois mestres: os dois mestram juntos, então a sessão é registrada uma vez
 * e gera um lançamento para cada mestre ativo da mesa, cada um com o valor cheio.
 * Se quem registra não é mestre da mesa (ex.: substituto lançado pelo gerente), o
 * lançamento é só dele.
 */
export async function registrarSessaoComRegras(
  dados: DadosNovaSessao,
  mestreId: number,
  valores: Record<string, string | string[]>,
  { mesaDoMestre }: { mesaDoMestre: boolean },
): Promise<{ ok: true; mensagem: string; valorCentavos: number } | { ok: false; estado: EstadoForm }> {
  const hoje = hojeISO();
  const erros: Record<string, string[]> = {};
  if (dados.data.toISOString().slice(0, 10) > hoje) erros.data = ["A data não pode ser no futuro."];
  if (dados.dataReferencia && dados.dataReferencia.toISOString().slice(0, 10) > hoje) {
    erros.dataReferencia = ["A data reposta não pode ser no futuro."];
  }

  const mesa = dados.mesaId
    ? await prisma.mesa.findFirst({
        where: { id: dados.mesaId, ativo: true, ...(mesaDoMestre ? mesasDoMestre(mestreId) : {}) },
        select: {
          id: true,
          nome: true,
          mestreId: true,
          mestre2Id: true,
          valorSessaoCentavos: true,
          tipoMesa: { select: { pagamentoMestre: true, valorSessaoCentavos: true, valorAlunoCentavos: true } },
        },
      })
    : null;
  if (dados.mesaId && !mesa) erros.mesaId = ["Mesa indisponível."];
  // Uma sessão por mesa por dia, de qualquer tipo. (A chave única do banco inclui o
  // tipo só para a mensalidade, datada no dia 1º, conviver com uma sessão nesse dia.)
  if (mesa && !erros.data) {
    const jaTem = await prisma.sessao.findFirst({
      where: { mesaId: mesa.id, data: dados.data, tipo: { not: "MENSALIDADE" } },
      select: { id: true },
    });
    if (jaTem) erros.data = [SESSAO_DUPLICADA];
  }
  if (Object.keys(erros).length) return { ok: false, estado: { erros, valores } };

  const valorCentavos = valorDaSessao(
    dados.tipo,
    mesa ? valorSessaoDaMesa(mesa, mesa.tipoMesa) : null,
    dados.tipo === "ONESHOT" ? await valorOneshot() : 0,
  );

  // quem recebe: os mestres (ativos) da mesa, se quem registra é um deles; senão, só quem registra
  const daMesa = mesa ? mestresDaMesa(mesa) : [];
  const candidatos = daMesa.includes(mestreId) ? daMesa : [mestreId];
  const mestres = await prisma.mestre.findMany({
    where: { id: { in: candidatos }, OR: [{ ativo: true }, { id: mestreId }] },
    select: { id: true, nome: true },
  });
  mestres.sort((a, b) => candidatos.indexOf(a.id) - candidatos.indexOf(b.id));

  try {
    await prisma.$transaction(
      mestres.map((m) =>
        prisma.sessao.create({
          data: {
            tipo: dados.tipo,
            mesaId: mesa?.id ?? null,
            nomeOneshot: dados.nomeOneshot,
            mestreId: m.id,
            data: dados.data,
            dataReferencia: dados.dataReferencia,
            observacoes: dados.observacoes,
            valorCentavos,
          },
        }),
      ),
    );
  } catch (e) {
    const erro = erroDeUnicidade(e, valores, "data", SESSAO_DUPLICADA);
    if (erro) return { ok: false, estado: erro };
    throw e;
  }

  const nome = nomeDaSessao({ mesa, nomeOneshot: dados.nomeOneshot });
  const extra = dados.dataReferencia ? ` (repõe ${formatarData(dados.dataReferencia)})` : "";
  const porAluno = mesa?.tipoMesa.pagamentoMestre === "POR_ALUNO";
  const valor = porAluno ? "sem valor (mesa paga por aluno, na mensalidade)" : formatarMoeda(valorCentavos);
  const dupla = mestres.length > 1 ? ` para ${mestres.map((m) => m.nome).join(" e ")}${porAluno ? "" : ", cada um"}` : "";
  return {
    ok: true,
    valorCentavos,
    mensagem: `${rotuloTipoSessao(dados.tipo)} registrada: ${nome} em ${formatarData(dados.data)}${extra} — ${valor}${dupla}.`,
  };
}

// ---------- Mensalidades (mesas pagas por aluno) ----------

export type MensalidadeDoMes = {
  mesaId: number;
  mesa: string;
  mestreId: number;
  mestre: string;
  /** Alunos e valores atuais da mesa (o que seria lançado agora). */
  alunos: number;
  valorAlunoCentavos: number;
  valorCentavos: number;
  /** Lançamento já feito para o mês, se houver (com os valores gravados na época). */
  lancada: { id: number; alunos: number | null; valorCentavos: number; pagoEm: Date | null } | null;
};

/**
 * Mesas ativas pagas por aluno, com mestre, e a mensalidade de cada uma no mês:
 * a já lançada ou a prévia com os alunos atuais. Aluno = vínculo com assinatura
 * não cancelada (a mesma conta da ocupação da mesa).
 */
export async function mensalidadesDoMes(mes: string, mestreId?: number): Promise<MensalidadeDoMes[]> {
  const { inicio } = intervaloDoMes(mes);
  const mesas = await prisma.mesa.findMany({
    where: { ativo: true, mestreId: mestreId ?? { not: null }, tipoMesa: { pagamentoMestre: "POR_ALUNO" } },
    orderBy: { nome: "asc" },
    include: {
      tipoMesa: true,
      mestre: { select: { id: true, nome: true } },
      sessoes: {
        where: { tipo: "MENSALIDADE", data: inicio },
        select: { id: true, alunos: true, valorCentavos: true, pagoEm: true },
      },
    },
  });
  const situacao = await situacaoDasMesas({ mesaIds: mesas.map((m) => m.id) });
  return mesas.flatMap((m) => {
    if (!m.mestre) return [];
    const alunos = situacao.de(m.id).ocupacao;
    return [
      {
        mesaId: m.id,
        mesa: m.nome,
        mestreId: m.mestre.id,
        mestre: m.mestre.nome,
        alunos,
        valorAlunoCentavos: valorAlunoDaMesa(m, m.tipoMesa),
        valorCentavos: mensalidadeDaMesa(m, m.tipoMesa, alunos),
        lancada: m.sessoes[0] ?? null,
      },
    ];
  });
}

/**
 * Lança as mensalidades do mês que ainda não existem (uma por mesa paga por aluno
 * com pelo menos um aluno). O valor fica gravado no lançamento, como nas sessões.
 * Meses futuros são recusados. Devolve quantas foram criadas.
 */
export async function lancarMensalidades(mes: string): Promise<number> {
  if (mes > mesAtual()) return 0;
  const { inicio } = intervaloDoMes(mes);
  const pendentes = (await mensalidadesDoMes(mes)).filter((m) => !m.lancada && m.alunos > 0);
  if (pendentes.length === 0) return 0;
  const r = await prisma.sessao.createMany({
    data: pendentes.map((m) => ({
      tipo: "MENSALIDADE" as const,
      mesaId: m.mesaId,
      mestreId: m.mestreId,
      data: inicio,
      alunos: m.alunos,
      valorCentavos: m.valorCentavos,
    })),
    skipDuplicates: true,
  });
  return r.count;
}
