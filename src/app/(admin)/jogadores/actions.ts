"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirGerente } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { assinaturaSchema, jogadorSchema, lerFormulario, validar, type EstadoForm } from "@/lib/validations";

// ---------- Jogador ----------

export async function criarJogador(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  await exigirGerente();
  const r = validar(jogadorSchema, formData);
  if (!r.ok) return r.estado;
  const jogador = await prisma.jogador.create({ data: r.dados });
  revalidatePath("/", "layout");
  redirect(`/jogadores/${jogador.id}`);
}

export async function atualizarJogador(id: number, _: EstadoForm, formData: FormData): Promise<EstadoForm> {
  await exigirGerente();
  const r = validar(jogadorSchema, formData);
  if (!r.ok) return r.estado;
  const existe = await prisma.jogador.findUnique({ where: { id }, select: { id: true } });
  if (!existe) return { mensagem: "Jogador não encontrado." };
  await prisma.jogador.update({ where: { id }, data: r.dados });
  revalidatePath("/", "layout");
  return { sucesso: "Dados do jogador salvos." };
}

export async function excluirJogador(id: number) {
  await exigirGerente();
  // as assinaturas (e seus vínculos com mesas) são apagadas em cascata
  await prisma.jogador.delete({ where: { id } });
  revalidatePath("/", "layout");
  redirect("/jogadores");
}

// ---------- Assinatura ----------

type AssinaturaAtual = {
  id: number;
  status: "ATIVO" | "INADIMPLENTE" | "CANCELADO";
  planoId: number;
  plataformaId: number;
  metodoPagamentoId: number;
  mesas: { mesaId: number }[];
};

async function salvarAssinatura(
  jogadorId: number,
  assinaturaId: number | null,
  formData: FormData,
): Promise<EstadoForm> {
  await exigirGerente();
  const r = validar(assinaturaSchema, formData);
  if (!r.ok) return r.estado;
  const dados = r.dados;
  const valores = lerFormulario(formData);

  const jogador = await prisma.jogador.findUnique({ where: { id: jogadorId }, select: { id: true } });
  if (!jogador) return { mensagem: "Jogador não encontrado." };

  let atual: AssinaturaAtual | null = null;
  if (assinaturaId) {
    atual = await prisma.assinatura.findFirst({
      where: { id: assinaturaId, jogadorId },
      select: {
        id: true,
        status: true,
        planoId: true,
        plataformaId: true,
        metodoPagamentoId: true,
        mesas: { select: { mesaId: true } },
      },
    });
    if (!atual) return { mensagem: "Assinatura não encontrada." };
  }

  // Plano, plataforma e método precisam existir e estar ativos.
  // Na edição, aceita manter um vínculo que foi desativado depois do cadastro.
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
  if (Object.keys(erros).length) return { erros, valores };

  // Mesas
  const jaVinculadas = new Set(atual?.mesas.map((m) => m.mesaId) ?? []);
  const errosMesa: string[] = [];
  if (plano && dados.mesaIds.length > plano.limiteMesas) {
    errosMesa.push(
      `O plano ${plano.nome} permite até ${plano.limiteMesas} mesa${plano.limiteMesas === 1 ? "" : "s"}.`,
    );
  }
  const mesas = await prisma.mesa.findMany({ where: { id: { in: dados.mesaIds } } });
  const porId = new Map(mesas.map((m) => [m.id, m]));
  for (const mesaId of dados.mesaIds) {
    const mesa = porId.get(mesaId);
    if (!mesa || (!mesa.ativo && !jaVinculadas.has(mesaId))) errosMesa.push("Uma das mesas selecionadas está indisponível.");
  }

  // Capacidade: só ocupa vaga quem não está cancelado. Confere as mesas novas e,
  // se a assinatura estava cancelada e voltou a valer, também as que já tinha.
  if (dados.status !== "CANCELADO") {
    const reativando = atual?.status === "CANCELADO";
    for (const mesaId of dados.mesaIds) {
      const mesa = porId.get(mesaId);
      if (!mesa || (jaVinculadas.has(mesaId) && !reativando)) continue;
      const ocupadas = await prisma.assinaturaMesa.count({
        where: {
          mesaId,
          assinatura: { status: { not: "CANCELADO" } },
          ...(atual ? { assinaturaId: { not: atual.id } } : {}),
        },
      });
      if (ocupadas >= mesa.capacidade) {
        errosMesa.push(`A mesa ${mesa.nome} está cheia (${ocupadas}/${mesa.capacidade}).`);
      }
    }
  }
  if (errosMesa.length) return { erros: { mesaIds: [...new Set(errosMesa)] }, valores };

  const { mesaIds, ...campos } = dados;
  await prisma.$transaction(async (tx) => {
    if (atual) {
      await tx.assinatura.update({ where: { id: atual.id }, data: campos });
      await tx.assinaturaMesa.deleteMany({ where: { assinaturaId: atual.id, mesaId: { notIn: mesaIds } } });
      const novas = mesaIds.filter((id) => !jaVinculadas.has(id));
      if (novas.length) {
        await tx.assinaturaMesa.createMany({
          data: novas.map((mesaId) => ({ assinaturaId: atual.id, mesaId })),
          skipDuplicates: true,
        });
      }
    } else {
      await tx.assinatura.create({
        data: { ...campos, jogadorId, mesas: { create: mesaIds.map((mesaId) => ({ mesaId })) } },
      });
    }
  });

  revalidatePath("/", "layout");
  redirect(`/jogadores/${jogadorId}`);
}

export async function criarAssinatura(jogadorId: number, _: EstadoForm, formData: FormData) {
  return salvarAssinatura(jogadorId, null, formData);
}

export async function atualizarAssinatura(
  jogadorId: number,
  assinaturaId: number,
  _: EstadoForm,
  formData: FormData,
) {
  return salvarAssinatura(jogadorId, assinaturaId, formData);
}

export async function excluirAssinatura(jogadorId: number, assinaturaId: number) {
  await exigirGerente();
  await prisma.assinatura.deleteMany({ where: { id: assinaturaId, jogadorId } });
  revalidatePath("/", "layout");
  redirect(`/jogadores/${jogadorId}`);
}
