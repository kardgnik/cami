import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { lerSessao } from "./session";

/**
 * Garante que há um gerente logado. Deve ser chamada em toda página e em toda
 * server action do painel: o proxy faz só uma checagem otimista.
 */
export const exigirGerente = cache(async () => {
  const sessao = await lerSessao();
  if (!sessao) redirect("/login");
  return sessao;
});
