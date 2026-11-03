"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirGerente } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { assinanteSchema, validar, type EstadoForm } from "@/lib/validations";

/**
 * Plano, plataforma e método precisam existir e estar ativos. Na edição, aceita
 * manter um vínculo que foi desativado depois do cadastro.
 */
async function conferirVinculos(
  dados: { planoId: number; plataformaId: number; metodoPagamentoId: number },
  atual: { planoId: number; plataformaId: number; metodoPagamentoId: number } | null,
) {
  const [plano, plataforma, metodo] = await Promise.all([
    prisma.plano.findUnique({ where: { id: dados.planoId } }),
    prisma.plataforma.findUnique({ where: { id: dados.plataformaId } }),
    prisma.metodoPagamento.findUnique({ where: { id: dados.metodoPagamentoId } }),
  ]);
  const erros: Record<string, string[]> = {};
  if (!plano || (!plano.ativo && atual?.planoId !== plano.id)) erros.planoId = ["Plano indisponível."];
  if (!plataforma || (!plataforma.ativo && atual?.plataformaId !== plataforma.id))
    erros.plataformaId = ["Plataforma indisponível."];
  if (!metodo || (!metodo.ativo && atual?.metodoPagamentoId !== metodo.id))
    erros.metodoPagamentoId = ["Método de pagamento indisponível."];
  return Object.keys(erros).length ? erros : null;
}

async function salvar(id: number | null, formData: FormData): Promise<EstadoForm> {
  await exigirGerente();
  const r = validar(assinanteSchema, formData);
  if (!r.ok) return r.estado;

  const atual = id ? await prisma.assinante.findUnique({ where: { id } }) : null;
  if (id && !atual) return { mensagem: "Assinante não encontrado." };

  const erros = await conferirVinculos(r.dados, atual);
  if (erros) return { erros, valores: Object.fromEntries(formData) as Record<string, string> };

  if (id) await prisma.assinante.update({ where: { id }, data: r.dados });
  else await prisma.assinante.create({ data: r.dados });

  revalidatePath("/", "layout");
  redirect("/assinantes");
}

export async function criarAssinante(_: EstadoForm, formData: FormData) {
  return salvar(null, formData);
}

export async function atualizarAssinante(id: number, _: EstadoForm, formData: FormData) {
  return salvar(id, formData);
}

export async function excluirAssinante(id: number) {
  await exigirGerente();
  await prisma.assinante.delete({ where: { id } });
  revalidatePath("/", "layout");
  redirect("/assinantes");
}
