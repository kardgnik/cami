"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirGerente } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { erroDeUnicidade, lerFormulario, tipoMesaSchema, validar, type EstadoForm } from "@/lib/validations";

async function salvar(id: number | null, formData: FormData): Promise<EstadoForm> {
  await exigirGerente();
  const r = validar(tipoMesaSchema, formData);
  if (!r.ok) return r.estado;
  try {
    if (id) await prisma.tipoMesa.update({ where: { id }, data: r.dados });
    else await prisma.tipoMesa.create({ data: r.dados });
  } catch (e) {
    const erro = erroDeUnicidade(e, lerFormulario(formData));
    if (erro) return erro;
    throw e;
  }
  revalidatePath("/", "layout");
  redirect("/tipos-mesa");
}

export async function criarTipoMesa(_: EstadoForm, formData: FormData) {
  return salvar(null, formData);
}

export async function atualizarTipoMesa(id: number, _: EstadoForm, formData: FormData) {
  return salvar(id, formData);
}
