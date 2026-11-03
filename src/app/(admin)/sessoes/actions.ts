"use server";

import { revalidatePath } from "next/cache";
import { intervaloDoMes, lerMes } from "@/lib/datas";
import { exigirGerente } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { registrarSessaoComRegras } from "@/lib/sessoes";
import { lerFormulario, sessaoAdminSchema, validar, type EstadoForm } from "@/lib/validations";

/** Registro feito pelo gerente em nome de um mestre. Não redireciona: devolve mensagem de sucesso. */
export async function registrarSessao(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  await exigirGerente();
  const r = validar(sessaoAdminSchema, formData);
  if (!r.ok) return r.estado;
  const valores = lerFormulario(formData);
  const mestre = await prisma.mestre.findUnique({ where: { id: r.dados.mestreId }, select: { id: true, nome: true, ativo: true } });
  if (!mestre || !mestre.ativo) return { erros: { mestreId: ["Mestre indisponível."] }, valores };

  const res = await registrarSessaoComRegras(r.dados, mestre.id, valores, { mesaDoMestre: false });
  if (!res.ok) return res.estado;
  revalidatePath("/", "layout");
  return { sucesso: `${res.mensagem} Mestre: ${mestre.nome}.` };
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
