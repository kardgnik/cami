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

  const [tipo, mestre] = await Promise.all([
    prisma.tipoMesa.findUnique({ where: { id: r.dados.tipoMesaId } }),
    r.dados.mestreId ? prisma.mestre.findUnique({ where: { id: r.dados.mestreId } }) : null,
  ]);
  const erros: Record<string, string[]> = {};
  if (!tipo) erros.tipoMesaId = ["Tipo de mesa inválido."];
  // aceita manter um mestre que foi desativado depois, mas não escolher um inativo
  if (r.dados.mestreId && (!mestre || (!mestre.ativo && atual?.mestreId !== mestre.id)))
    erros.mestreId = ["Mestre indisponível."];
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
