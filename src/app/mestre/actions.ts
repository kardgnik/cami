"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { exigirMestre } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { registrarSessaoComRegras } from "@/lib/sessoes";
import {
  lerFormulario,
  sessaoSchema,
  trocarSenhaSchema,
  validar,
  type EstadoForm,
} from "@/lib/validations";

/** O mestre registra uma sessão: de uma das suas mesas ativas ou uma oneshot. */
export async function registrarSessao(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const mestre = await exigirMestre();
  const r = validar(sessaoSchema, formData);
  if (!r.ok) return r.estado;
  const res = await registrarSessaoComRegras(r.dados, mestre.id, lerFormulario(formData), { mesaDoMestre: true });
  if (!res.ok) return res.estado;
  revalidatePath("/", "layout");
  return { sucesso: res.mensagem };
}

/**
 * Exclui uma sessão do próprio mestre, desde que ainda não tenha sido paga. Mensalidades
 * são do gerente. Numa mesa com dois mestres a sessão foi registrada uma vez para os dois,
 * então sai também o lançamento do outro mestre, se ainda não estiver pago.
 */
export async function excluirSessao(id: number) {
  const mestre = await exigirMestre();
  const sessao = await prisma.sessao.findFirst({
    where: { id, mestreId: mestre.id, pagoEm: null, tipo: { not: "MENSALIDADE" } },
    select: { id: true, mesaId: true, data: true, tipo: true },
  });
  if (!sessao) return;
  await prisma.sessao.deleteMany({
    where: sessao.mesaId
      ? { mesaId: sessao.mesaId, data: sessao.data, tipo: sessao.tipo, pagoEm: null }
      : { id: sessao.id },
  });
  revalidatePath("/", "layout");
}

export async function trocarSenha(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const mestre = await exigirMestre();
  const r = validar(trocarSenhaSchema, formData);
  if (!r.ok) return r.estado;

  const atual = await prisma.mestre.findUniqueOrThrow({ where: { id: mestre.id }, select: { senhaHash: true } });
  if (!(await bcrypt.compare(r.dados.senhaAtual, atual.senhaHash))) {
    return { erros: { senhaAtual: ["Senha atual incorreta."] } };
  }

  await prisma.mestre.update({
    where: { id: mestre.id },
    data: { senhaHash: await bcrypt.hash(r.dados.novaSenha, 12) },
  });
  return { sucesso: "Senha alterada." };
}
