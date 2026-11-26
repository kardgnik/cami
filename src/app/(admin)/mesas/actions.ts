"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirGerente } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { erroDeUnicidade, lerFormulario, mesaSchema, validar, type EstadoForm } from "@/lib/validations";

async function salvar(id: number | null, formData: FormData): Promise<EstadoForm> {
  await exigirGerente();
  const r = validar(mesaSchema, formData);
  if (!r.ok) return r.estado;
  const valores = lerFormulario(formData);

  const atual = id ? await prisma.mesa.findUnique({ where: { id } }) : null;
  if (id && !atual) return { mensagem: "Mesa não encontrada." };

  const [tipo, mestre, mestre2] = await Promise.all([
    prisma.tipoMesa.findUnique({ where: { id: r.dados.tipoMesaId } }),
    r.dados.mestreId ? prisma.mestre.findUnique({ where: { id: r.dados.mestreId } }) : null,
    r.dados.mestre2Id ? prisma.mestre.findUnique({ where: { id: r.dados.mestre2Id } }) : null,
  ]);
  const erros: Record<string, string[]> = {};
  if (!tipo) erros.tipoMesaId = ["Tipo de mesa inválido."];
  // aceita manter um mestre que foi desativado depois, mas não escolher um inativo
  const jaEstava = (id: number) => atual?.mestreId === id || atual?.mestre2Id === id;
  if (r.dados.mestreId && (!mestre || (!mestre.ativo && !jaEstava(mestre.id)))) erros.mestreId = ["Mestre indisponível."];
  if (r.dados.mestre2Id && (!mestre2 || (!mestre2.ativo && !jaEstava(mestre2.id)))) erros.mestre2Id = ["Mestre indisponível."];
  if (r.dados.mestre2Id && tipo?.pagamentoMestre === "POR_ALUNO") {
    erros.mestre2Id = ["Mesas pagas por aluno têm um só mestre."];
  }
  if (Object.keys(erros).length) return { erros, valores };

  try {
    if (id) await prisma.mesa.update({ where: { id }, data: r.dados });
    else await prisma.mesa.create({ data: r.dados });
  } catch (e) {
    const erro = erroDeUnicidade(e, valores, "nome", "Já existe uma mesa com este nome.");
    if (erro) return erro;
    throw e;
  }
  revalidatePath("/", "layout");
  redirect("/mesas");
}

export async function criarMesa(_: EstadoForm, formData: FormData) {
  return salvar(null, formData);
}

export async function atualizarMesa(id: number, _: EstadoForm, formData: FormData) {
  return salvar(id, formData);
}

export async function alternarMesa(id: number) {
  await exigirGerente();
  const atual = await prisma.mesa.findUniqueOrThrow({ where: { id } });
  await prisma.mesa.update({ where: { id }, data: { ativo: !atual.ativo } });
  revalidatePath("/", "layout");
}

/**
 * Exclui a mesa junto com o histórico dela: as sessões registradas (inclusive as
 * pagas) e os vínculos com assinaturas. As assinaturas e os jogadores continuam.
 */
export async function excluirMesa(id: number): Promise<EstadoForm> {
  await exigirGerente();
  await prisma.$transaction([
    prisma.sessao.deleteMany({ where: { mesaId: id } }),
    prisma.assinaturaMesa.deleteMany({ where: { mesaId: id } }),
    prisma.mesa.delete({ where: { id } }),
  ]);
  revalidatePath("/", "layout");
  redirect("/mesas");
}
