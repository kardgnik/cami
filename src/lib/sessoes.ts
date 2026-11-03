import "server-only";
import { hojeISO } from "./datas";
import { prisma } from "./db";
import { valorDaSessao, valorSessaoDaMesa, type TipoSessao } from "./finance";
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

  let mesa: { id: number; nome: string; valorSessaoCentavos: number | null; tipoMesa: { valorSessaoCentavos: number } } | null =
    null;
  if (dados.mesaId) {
    mesa = await prisma.mesa.findFirst({
      where: { id: dados.mesaId, ativo: true, ...(mesaDoMestre ? { mestreId } : {}) },
      select: { id: true, nome: true, valorSessaoCentavos: true, tipoMesa: { select: { valorSessaoCentavos: true } } },
    });
    if (!mesa) erros.mesaId = ["Mesa indisponível."];
  }
  if (Object.keys(erros).length) return { ok: false, estado: { erros, valores } };

  const valorCentavos = valorDaSessao(
    dados.tipo,
    mesa ? valorSessaoDaMesa(mesa, mesa.tipoMesa) : null,
    dados.tipo === "ONESHOT" ? await valorOneshot() : 0,
  );

  try {
    await prisma.sessao.create({
      data: {
        tipo: dados.tipo,
        mesaId: mesa?.id ?? null,
        nomeOneshot: dados.nomeOneshot,
        mestreId,
        data: dados.data,
        dataReferencia: dados.dataReferencia,
        observacoes: dados.observacoes,
        valorCentavos,
      },
    });
  } catch (e) {
    const erro = erroDeUnicidade(e, valores, "data", "Esta mesa já tem sessão registrada nesta data.");
    if (erro) return { ok: false, estado: erro };
    throw e;
  }

  const nome = nomeDaSessao({ mesa, nomeOneshot: dados.nomeOneshot });
  const extra = dados.dataReferencia ? ` (repõe ${formatarData(dados.dataReferencia)})` : "";
  return {
    ok: true,
    valorCentavos,
    mensagem: `${rotuloTipoSessao(dados.tipo)} registrada: ${nome} em ${formatarData(dados.data)}${extra} — ${formatarMoeda(valorCentavos)}.`,
  };
}
