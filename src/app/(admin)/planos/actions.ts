"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirGerente } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { erroDeUnicidade, planoSchema, validar, type EstadoForm } from "@/lib/validations";

async function salvar(id: number | null, formData: FormData): Promise<EstadoForm> {
  await exigirGerente();
  const r = validar(planoSchema, formData);
  if (!r.ok) return r.estado;
  try {
    if (id) await prisma.plano.update({ where: { id }, data: r.dados });
    else await prisma.plano.create({ data: r.dados });
  } catch (e) {
    const erro = erroDeUnicidade(e, Object.fromEntries(formData) as Record<string, string>);
    if (erro) return erro;
    throw e;
  }
  revalidatePath("/", "layout");
  redirect("/planos");
}

export async function criarPlano(_: EstadoForm, formData: FormData) {
  return salvar(null, formData);
}

export async function atualizarPlano(id: number, _: EstadoForm, formData: FormData) {
  return salvar(id, formData);
}

export async function alternarPlano(id: number) {
  await exigirGerente();
  const atual = await prisma.plano.findUniqueOrThrow({ where: { id } });
  await prisma.plano.update({ where: { id }, data: { ativo: !atual.ativo } });
  revalidatePath("/", "layout");
}
