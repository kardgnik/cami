import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "./db";
import { inicioDoPerfil, lerSessao } from "./session";

/**
 * Garante que há um gerente logado. Deve ser chamada em toda página e em toda
 * server action do painel administrativo: o proxy faz só uma checagem otimista.
 */
export const exigirGerente = cache(async () => {
  const sessao = await lerSessao();
  if (!sessao) redirect("/login");
  if (sessao.perfil !== "gerente") redirect(inicioDoPerfil(sessao.perfil));
  return sessao;
});

/**
 * Garante que há um mestre ativo logado e devolve seus dados. Deve ser chamada em
 * toda página e server action do painel do mestre. Consulta o banco para que um
 * mestre desativado perca o acesso imediatamente.
 */
export const exigirMestre = cache(async () => {
  const sessao = await lerSessao();
  if (!sessao) redirect("/login");
  if (sessao.perfil !== "mestre") redirect(inicioDoPerfil(sessao.perfil));
  const mestre = await prisma.mestre.findUnique({
    where: { id: sessao.id },
    select: { id: true, nome: true, email: true, ativo: true },
  });
  if (!mestre || !mestre.ativo) redirect("/login?inativo=1");
  return mestre;
});
