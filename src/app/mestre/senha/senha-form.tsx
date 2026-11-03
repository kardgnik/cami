"use client";

import { useActionState } from "react";
import { Campo, Erro } from "@/components/form";
import type { EstadoForm } from "@/lib/validations";
import { trocarSenha } from "../actions";

export function SenhaForm() {
  const [estado, enviar, pendente] = useActionState(trocarSenha, {} as EstadoForm);
  return (
    <form key={estado.sucesso ? "ok" : "form"} action={enviar} className="cartao max-w-md space-y-4 p-6">
      <Campo
        rotulo="Senha atual"
        name="senhaAtual"
        type="password"
        autoComplete="current-password"
        required
        erros={estado.erros?.senhaAtual}
      />
      <Campo
        rotulo="Nova senha"
        name="novaSenha"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        ajuda="Mínimo de 8 caracteres."
        erros={estado.erros?.novaSenha}
      />
      <Campo
        rotulo="Confirme a nova senha"
        name="confirmacao"
        type="password"
        autoComplete="new-password"
        required
        erros={estado.erros?.confirmacao}
      />
      <Erro mensagem={estado.mensagem} />
      {estado.sucesso && (
        <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {estado.sucesso}
        </p>
      )}
      <button type="submit" disabled={pendente} className="btn-primario">
        {pendente ? "Salvando..." : "Alterar senha"}
      </button>
    </form>
  );
}
