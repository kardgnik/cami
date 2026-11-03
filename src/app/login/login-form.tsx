"use client";

import { useActionState } from "react";
import { entrar } from "@/app/actions/auth";
import { Campo, Erro } from "@/components/form";

export function LoginForm({ de }: { de: string }) {
  const [estado, acao, pendente] = useActionState(entrar, {});
  return (
    <form action={acao} className="mt-6 space-y-4">
      <input type="hidden" name="de" value={de} />
      <Campo
        rotulo="E-mail"
        name="email"
        type="email"
        autoComplete="username"
        required
        defaultValue={estado.valores?.email}
        erros={estado.erros?.email}
      />
      <Campo
        rotulo="Senha"
        name="senha"
        type="password"
        autoComplete="current-password"
        required
        erros={estado.erros?.senha}
      />
      <Erro mensagem={estado.mensagem} />
      <button type="submit" disabled={pendente} className="btn-primario w-full">
        {pendente ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
