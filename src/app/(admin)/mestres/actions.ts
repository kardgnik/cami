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

const ERRO_USUARIO_GERENTE = "Este usuário já é usado pelo gerente.";
const ERRO_USUARIO_DUPLICADO = "Já existe um mestre com este usuário.";

/** Campos sem senha, para devolver ao formulário em caso de erro. */
function valoresSemSenha(formData: FormData) {
  const valores = lerFormulario(formData);
  delete valores.senha;
  return valores;
}

async function usuarioDoGerente(usuario: string) {
  return !!(await prisma.gerente.findUnique({ where: { usuario }, select: { id: true } }));
}

export async function criarMestre(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  await exigirGerente();
  const r = validar(mestreCriarSchema, formData);
  if (!r.ok) return r.estado;
  const valores = valoresSemSenha(formData);
  if (await usuarioDoGerente(r.dados.usuario)) return { erros: { usuario: [ERRO_USUARIO_GERENTE] }, valores };

  const { senha, ...dados } = r.dados;
  try {
    await prisma.mestre.create({ data: { ...dados, senhaHash: await bcrypt.hash(senha, 12) } });
  } catch (e) {
    const erro = erroDeUnicidade(e, valores, "usuario", ERRO_USUARIO_DUPLICADO);
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
  if (await usuarioDoGerente(r.dados.usuario)) return { erros: { usuario: [ERRO_USUARIO_GERENTE] }, valores };

  const { senha, ...dados } = r.dados;
  try {
    await prisma.mestre.update({
      where: { id },
      data: { ...dados, ...(senha ? { senhaHash: await bcrypt.hash(senha, 12) } : {}) },
    });
  } catch (e) {
    const erro = erroDeUnicidade(e, valores, "usuario", ERRO_USUARIO_DUPLICADO);
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
