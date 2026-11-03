"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { hojeISO } from "@/lib/datas";
import { exigirMestre } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { valorSessaoDaMesa } from "@/lib/finance";
import { formatarData, formatarMoeda } from "@/lib/format";
import {
  erroDeUnicidade,
  lerFormulario,
  sessaoSchema,
  trocarSenhaSchema,
  validar,
  type EstadoForm,
} from "@/lib/validations";

/** O mestre registra uma sessão que conduziu numa das suas mesas ativas. */
export async function registrarSessao(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const mestre = await exigirMestre();
  const r = validar(sessaoSchema, formData);
  if (!r.ok) return r.estado;
  const valores = lerFormulario(formData);

  const mesa = await prisma.mesa.findFirst({
    where: { id: r.dados.mesaId, mestreId: mestre.id, ativo: true },
    include: { tipoMesa: true },
  });
  if (!mesa) return { erros: { mesaId: ["Mesa indisponível."] }, valores };

  if (r.dados.data.toISOString().slice(0, 10) > hojeISO()) {
    return { erros: { data: ["A data não pode ser no futuro."] }, valores };
  }

  const valorCentavos = valorSessaoDaMesa(mesa, mesa.tipoMesa);
  try {
    await prisma.sessao.create({
      data: {
        mesaId: mesa.id,
        mestreId: mestre.id,
        data: r.dados.data,
        valorCentavos,
        observacoes: r.dados.observacoes,
      },
    });
  } catch (e) {
    const erro = erroDeUnicidade(e, valores, "data", "Esta mesa já tem sessão registrada nesta data.");
    if (erro) return erro;
    throw e;
  }

  revalidatePath("/", "layout");
  return {
    sucesso: `Sessão registrada: ${mesa.nome} em ${formatarData(r.dados.data)} — ${formatarMoeda(valorCentavos)}.`,
  };
}

/** Exclui uma sessão do próprio mestre, desde que ainda não tenha sido paga. */
export async function excluirSessao(id: number) {
  const mestre = await exigirMestre();
  await prisma.sessao.deleteMany({ where: { id, mestreId: mestre.id, pagoEm: null } });
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
