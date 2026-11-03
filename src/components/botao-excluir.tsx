"use client";

import { useActionState } from "react";
import type { EstadoForm } from "@/lib/validations";

/**
 * Botão "Excluir" que pede confirmação e mostra o motivo quando a exclusão é
 * recusada (ex.: plano ainda usado por assinaturas). Em caso de sucesso, a action
 * redireciona.
 */
export function BotaoExcluir({
  acao,
  confirmacao,
  rotulo = "Excluir",
}: {
  acao: (estado: EstadoForm, formData: FormData) => Promise<EstadoForm>;
  confirmacao: string;
  rotulo?: string;
}) {
  const [estado, enviar, pendente] = useActionState(acao, {} as EstadoForm);
  return (
    <form
      action={enviar}
      onSubmit={(e) => {
        if (!window.confirm(confirmacao)) e.preventDefault();
      }}
      className="flex flex-col items-end gap-2"
    >
      <button type="submit" disabled={pendente} className="btn-perigo">
        {pendente ? "Excluindo..." : rotulo}
      </button>
      {estado.mensagem && (
        <p role="alert" className="max-w-sm rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-left text-sm text-red-700">
          {estado.mensagem}
        </p>
      )}
    </form>
  );
}
