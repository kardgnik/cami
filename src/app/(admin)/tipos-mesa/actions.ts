"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirGerente } from "@/lib/dal";
import { prisma } from "@/lib/db";
import {
  configuracaoSchema,
  erroDeUnicidade,
  lerFormulario,
  tipoMesaSchema,
  validar,
  type EstadoForm,
} from "@/lib/validations";

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

/** Valor padrão pago ao mestre por oneshot (Configuracao id = 1). Não redireciona. */
export async function salvarValorOneshot(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  await exigirGerente();
  const r = validar(configuracaoSchema, formData);
  if (!r.ok) return r.estado;
  await prisma.configuracao.upsert({ where: { id: 1 }, update: r.dados, create: { id: 1, ...r.dados } });
  revalidatePath("/", "layout");
  return { sucesso: "Valor da oneshot salvo. Vale para as oneshots registradas daqui em diante." };
}

/** Exclui o tipo de mesa se nenhuma mesa o usa; senão explica o motivo. */
export async function excluirTipoMesa(id: number): Promise<EstadoForm> {
  await exigirGerente();
  const usos = await prisma.mesa.count({ where: { tipoMesaId: id } });
  if (usos > 0) {
    return {
      mensagem: `Este tipo é usado por ${usos} mesa${usos === 1 ? "" : "s"}. Mude o tipo delas ou exclua-as antes.`,
    };
  }
  await prisma.tipoMesa.delete({ where: { id } });
  revalidatePath("/", "layout");
  redirect("/tipos-mesa");
}
