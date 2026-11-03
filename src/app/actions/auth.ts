"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { criarSessao, encerrarSessao } from "@/lib/session";
import { loginSchema, validar, type EstadoForm } from "@/lib/validations";

// Hash fixo usado quando o e-mail não existe, para o tempo de resposta não revelar isso.
const HASH_FALSO = "$2b$12$.eNcQYiOR77ta.L66jy3WuV7DzjYK9zaJ7p/vaZouuha0dYAPANB2";

export async function entrar(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const r = validar(loginSchema, formData);
  if (!r.ok) return { ...r.estado, valores: { email: r.estado.valores?.email ?? "" } };

  const gerente = await prisma.gerente.findUnique({ where: { email: r.dados.email } });
  const senhaOk = await bcrypt.compare(r.dados.senha, gerente?.senhaHash ?? HASH_FALSO);
  if (!gerente || !senhaOk) {
    return { mensagem: "E-mail ou senha incorretos.", valores: { email: r.dados.email } };
  }

  await criarSessao(gerente.id);
  const destino = String(formData.get("de") ?? "");
  // só aceita caminhos internos para evitar redirecionamento aberto
  redirect(destino.startsWith("/") && !destino.startsWith("//") ? destino : "/");
}

export async function sair() {
  await encerrarSessao();
  redirect("/login");
}
