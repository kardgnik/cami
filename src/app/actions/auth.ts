"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { criarSessao, encerrarSessao, inicioDoPerfil, type Perfil } from "@/lib/session";
import { loginSchema, validar, type EstadoForm } from "@/lib/validations";

// Hash fixo usado quando o e-mail não existe, para o tempo de resposta não revelar isso.
const HASH_FALSO = "$2b$12$.eNcQYiOR77ta.L66jy3WuV7DzjYK9zaJ7p/vaZouuha0dYAPANB2";

/** Procura o e-mail entre gerentes e, depois, entre mestres ativos. */
async function buscarConta(email: string): Promise<{ perfil: Perfil; id: number; senhaHash: string } | null> {
  const gerente = await prisma.gerente.findUnique({ where: { email } });
  if (gerente) return { perfil: "gerente", id: gerente.id, senhaHash: gerente.senhaHash };
  const mestre = await prisma.mestre.findUnique({ where: { email } });
  if (mestre?.ativo) return { perfil: "mestre", id: mestre.id, senhaHash: mestre.senhaHash };
  return null;
}

export async function entrar(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const r = validar(loginSchema, formData);
  if (!r.ok) return { ...r.estado, valores: { email: r.estado.valores?.email ?? "" } };

  const conta = await buscarConta(r.dados.email);
  const senhaOk = await bcrypt.compare(r.dados.senha, conta?.senhaHash ?? HASH_FALSO);
  if (!conta || !senhaOk) {
    return { mensagem: "E-mail ou senha incorretos.", valores: { email: r.dados.email } };
  }

  await criarSessao(conta.perfil, conta.id);
  const inicio = inicioDoPerfil(conta.perfil);
  const destino = String(formData.get("de") ?? "");
  // só aceita caminhos internos da área do próprio perfil (evita redirecionamento aberto)
  const interno = destino.startsWith("/") && !destino.startsWith("//");
  const daAreaDoMestre = destino === "/mestre" || destino.startsWith("/mestre/");
  const permitido = interno && daAreaDoMestre === (conta.perfil === "mestre");
  redirect(permitido ? destino : inicio);
}

export async function sair() {
  await encerrarSessao();
  redirect("/login");
}
