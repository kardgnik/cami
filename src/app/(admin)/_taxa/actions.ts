"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirGerente } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { erroDeUnicidade, taxaEntidadeSchema, validar, type EstadoForm } from "@/lib/validations";
import { CONFIG_TAXA, type TipoTaxa } from "./config";

async function salvar(tipo: TipoTaxa, id: number | null, formData: FormData): Promise<EstadoForm> {
  await exigirGerente();
  const r = validar(taxaEntidadeSchema, formData);
  if (!r.ok) return r.estado;

  try {
    if (tipo === "plataforma") {
      if (id) await prisma.plataforma.update({ where: { id }, data: r.dados });
      else await prisma.plataforma.create({ data: r.dados });
    } else {
      if (id) await prisma.metodoPagamento.update({ where: { id }, data: r.dados });
      else await prisma.metodoPagamento.create({ data: r.dados });
    }
  } catch (e) {
    const erro = erroDeUnicidade(e, Object.fromEntries(formData) as Record<string, string>);
    if (erro) return erro;
    throw e;
  }

  // a taxa afeta o líquido mostrado em assinantes e no painel
  revalidatePath("/", "layout");
  redirect(CONFIG_TAXA[tipo].caminho);
}

async function alternar(tipo: TipoTaxa, id: number) {
  await exigirGerente();
  if (tipo === "plataforma") {
    const atual = await prisma.plataforma.findUniqueOrThrow({ where: { id } });
    await prisma.plataforma.update({ where: { id }, data: { ativo: !atual.ativo } });
  } else {
    const atual = await prisma.metodoPagamento.findUniqueOrThrow({ where: { id } });
    await prisma.metodoPagamento.update({ where: { id }, data: { ativo: !atual.ativo } });
  }
  revalidatePath("/", "layout");
}

export async function criarPlataforma(_: EstadoForm, formData: FormData) {
  return salvar("plataforma", null, formData);
}
export async function atualizarPlataforma(id: number, _: EstadoForm, formData: FormData) {
  return salvar("plataforma", id, formData);
}
export async function alternarPlataforma(id: number) {
  return alternar("plataforma", id);
}

export async function criarMetodo(_: EstadoForm, formData: FormData) {
  return salvar("metodoPagamento", null, formData);
}
export async function atualizarMetodo(id: number, _: EstadoForm, formData: FormData) {
  return salvar("metodoPagamento", id, formData);
}
export async function alternarMetodo(id: number) {
  return alternar("metodoPagamento", id);
}
