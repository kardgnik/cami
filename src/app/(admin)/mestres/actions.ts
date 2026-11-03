"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirGerente } from "@/lib/dal";
import { prisma } from "@/lib/db";
import {
  erroDeUnicidade,
  lerFormulario,
  mestreCriarSchema,
  mestreEditarSchema,
  validar,
  type EstadoForm,
} from "@/lib/validations";

const ERRO_EMAIL_GERENTE = "Este e-mail já é usado pelo gerente.";
const ERRO_EMAIL_DUPLICADO = "Já existe um mestre com este e-mail.";

/** Campos sem senha, para devolver ao formulário em caso de erro. */
function valoresSemSenha(formData: FormData) {
  const valores = lerFormulario(formData);
  delete valores.senha;
  return valores;
}

async function emailDoGerente(email: string) {
  return !!(await prisma.gerente.findUnique({ where: { email }, select: { id: true } }));
}

export async function criarMestre(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  await exigirGerente();
  const r = validar(mestreCriarSchema, formData);
  if (!r.ok) return r.estado;
  const valores = valoresSemSenha(formData);
  if (await emailDoGerente(r.dados.email)) return { erros: { email: [ERRO_EMAIL_GERENTE] }, valores };

  const { senha, ...dados } = r.dados;
  try {
    await prisma.mestre.create({ data: { ...dados, senhaHash: await bcrypt.hash(senha, 12) } });
  } catch (e) {
    const erro = erroDeUnicidade(e, valores, "email", ERRO_EMAIL_DUPLICADO);
    if (erro) return erro;
    throw e;
  }
  revalidatePath("/", "layout");
  redirect("/mestres");
}

export async function atualizarMestre(id: number, _: EstadoForm, formData: FormData): Promise<EstadoForm> {
  await exigirGerente();
  const r = validar(mestreEditarSchema, formData);
  if (!r.ok) return r.estado;
  const valores = valoresSemSenha(formData);
  if (await emailDoGerente(r.dados.email)) return { erros: { email: [ERRO_EMAIL_GERENTE] }, valores };

  const { senha, ...dados } = r.dados;
  try {
    await prisma.mestre.update({
      where: { id },
      data: { ...dados, ...(senha ? { senhaHash: await bcrypt.hash(senha, 12) } : {}) },
    });
  } catch (e) {
    const erro = erroDeUnicidade(e, valores, "email", ERRO_EMAIL_DUPLICADO);
    if (erro) return erro;
    throw e;
  }
  revalidatePath("/", "layout");
  redirect("/mestres");
}

export async function alternarMestre(id: number) {
  await exigirGerente();
  const atual = await prisma.mestre.findUniqueOrThrow({ where: { id }, select: { ativo: true } });
  await prisma.mestre.update({ where: { id }, data: { ativo: !atual.ativo } });
  revalidatePath("/", "layout");
}
