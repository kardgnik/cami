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

/** Exclui plataforma/método se nenhuma assinatura o usa; senão explica o motivo. */
async function excluir(tipo: TipoTaxa, id: number): Promise<EstadoForm> {
  await exigirGerente();
  const usos =
    tipo === "plataforma"
      ? await prisma.assinatura.count({ where: { plataformaId: id } })
      : await prisma.assinatura.count({ where: { metodoPagamentoId: id } });
  const c = CONFIG_TAXA[tipo];
  if (usos > 0) {
    return {
      mensagem: `Est${c.artigo === "a" ? "a" : "e"} ${c.singular} é usad${c.artigo} por ${usos} assinatura${usos === 1 ? "" : "s"}. Troque nas assinaturas ou exclua-as antes — ou apenas desative.`,
    };
  }
  if (tipo === "plataforma") await prisma.plataforma.delete({ where: { id } });
  else await prisma.metodoPagamento.delete({ where: { id } });
  revalidatePath("/", "layout");
  redirect(c.caminho);
}

export async function excluirPlataforma(id: number) {
  return excluir("plataforma", id);
}
export async function excluirMetodo(id: number) {
  return excluir("metodoPagamento", id);
}
