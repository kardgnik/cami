"use server";

import { revalidatePath } from "next/cache";
import { hojeISO, intervaloDoMes, lerMes } from "@/lib/datas";
import { exigirGerente } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { valorSessaoDaMesa } from "@/lib/finance";
import { formatarData, formatarMoeda } from "@/lib/format";
import { erroDeUnicidade, lerFormulario, sessaoAdminSchema, validar, type EstadoForm } from "@/lib/validations";

/** Registro feito pelo gerente em nome de um mestre. Não redireciona: devolve mensagem de sucesso. */
export async function registrarSessao(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  await exigirGerente();
  const r = validar(sessaoAdminSchema, formData);
  if (!r.ok) return r.estado;
  const valores = lerFormulario(formData);

  if (r.dados.data.toISOString().slice(0, 10) > hojeISO()) {
    return { erros: { data: ["A data não pode ser no futuro."] }, valores };
  }
  const [mesa, mestre] = await Promise.all([
    prisma.mesa.findUnique({ where: { id: r.dados.mesaId }, include: { tipoMesa: true } }),
    prisma.mestre.findUnique({ where: { id: r.dados.mestreId }, select: { id: true, nome: true, ativo: true } }),
  ]);
  const erros: Record<string, string[]> = {};
  if (!mesa || !mesa.ativo) erros.mesaId = ["Mesa indisponível."];
  if (!mestre || !mestre.ativo) erros.mestreId = ["Mestre indisponível."];
  if (!mesa || !mestre || Object.keys(erros).length) return { erros, valores };

  const valorCentavos = valorSessaoDaMesa(mesa, mesa.tipoMesa);
  try {
    await prisma.sessao.create({
      data: {
        mesaId: mesa.id,
        mestreId: mestre.id,
        data: r.dados.data,
        observacoes: r.dados.observacoes,
        valorCentavos,
      },
    });
  } catch (e) {
    const erro = erroDeUnicidade(e, valores, "data", "Já existe uma sessão desta mesa nesta data.");
    if (erro) return erro;
    throw e;
  }
  revalidatePath("/", "layout");
  return {
    sucesso: `Sessão de ${mesa.nome} em ${formatarData(r.dados.data)} registrada para ${mestre.nome} (${formatarMoeda(valorCentavos)}).`,
  };
}

export async function marcarPaga(id: number) {
  await exigirGerente();
  await prisma.sessao.updateMany({ where: { id, pagoEm: null }, data: { pagoEm: new Date() } });
  revalidatePath("/", "layout");
}

export async function desfazerPagamento(id: number) {
  await exigirGerente();
  await prisma.sessao.update({ where: { id }, data: { pagoEm: null } });
  revalidatePath("/", "layout");
}

export async function excluirSessao(id: number) {
  await exigirGerente();
  await prisma.sessao.delete({ where: { id } });
  revalidatePath("/", "layout");
}

/** Marca como pagas todas as sessões ainda não pagas de um mestre no mês (data da sessão). */
export async function marcarTodasPagas(mestreId: number, mes: string) {
  await exigirGerente();
  const mesValido = lerMes(mes);
  if (!mesValido) return;
  const { inicio, fim } = intervaloDoMes(mesValido);
  await prisma.sessao.updateMany({
    where: { mestreId, pagoEm: null, data: { gte: inicio, lt: fim } },
    data: { pagoEm: new Date() },
  });
  revalidatePath("/", "layout");
}
