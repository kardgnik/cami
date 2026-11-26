"use server";

import { revalidatePath } from "next/cache";
import { intervaloDoMes, lerMes, rotuloMes } from "@/lib/datas";
import { exigirGerente } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { lancarMensalidades, registrarSessaoComRegras } from "@/lib/sessoes";
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
  // mesa com dois mestres: a mensagem já diz para quem foi; senão, diz o mestre escolhido
  return { sucesso: res.mensagem.includes(" para ") ? res.mensagem : `${res.mensagem} Mestre: ${mestre.nome}.` };
}

export async function marcarPaga(id: number) {
  await exigirGerente();
  await prisma.sessao.updateMany({ where: { id, pagoEm: null, valorCentavos: { gt: 0 } }, data: { pagoEm: new Date() } });
  revalidatePath("/", "layout");
}

export async function desfazerPagamento(id: number) {
  await exigirGerente();
  // updateMany/deleteMany: um segundo clique num item que já mudou não vira erro
  await prisma.sessao.updateMany({ where: { id }, data: { pagoEm: null } });
  revalidatePath("/", "layout");
}

export async function excluirSessao(id: number) {
  await exigirGerente();
  await prisma.sessao.deleteMany({ where: { id } });
  revalidatePath("/", "layout");
}

/** Lança as mensalidades do mês das mesas pagas por aluno que ainda não têm lançamento. */
export async function lancarMensalidadesDoMes(mes: string): Promise<EstadoForm> {
  await exigirGerente();
  const mesValido = lerMes(mes);
  if (!mesValido) return { mensagem: "Mês inválido." };
  const criadas = await lancarMensalidades(mesValido);
  revalidatePath("/", "layout");
  if (criadas === 0) return { mensagem: `Nenhuma mensalidade a lançar em ${rotuloMes(mesValido)}.` };
  return {
    sucesso: `${criadas} mensalidade${criadas === 1 ? " lançada" : "s lançadas"} em ${rotuloMes(mesValido)}. Agora ${criadas === 1 ? "ela aparece" : "elas aparecem"} como "a receber" para o mestre.`,
  };
}

/** Marca como pagas todas as sessões ainda não pagas de um mestre no mês (data da sessão). */
export async function marcarTodasPagas(mestreId: number, mes: string) {
  await exigirGerente();
  const mesValido = lerMes(mes);
  if (!mesValido) return;
  const { inicio, fim } = intervaloDoMes(mesValido);
  await prisma.sessao.updateMany({
    where: { mestreId, pagoEm: null, valorCentavos: { gt: 0 }, data: { gte: inicio, lt: fim } },
    data: { pagoEm: new Date() },
  });
  revalidatePath("/", "layout");
}
