"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";

/** Botão de envio que pede confirmação antes de submeter o formulário. */
export function BotaoConfirmar({
  confirmacao,
  children,
  ...botao
}: ComponentProps<"button"> & { confirmacao: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      {...botao}
      type="submit"
      disabled={pending || botao.disabled}
      onClick={(e) => {
        if (!window.confirm(confirmacao)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}

/** Botão de envio que mostra estado de carregamento. */
export function BotaoEnviar({ children, pendente, ...botao }: ComponentProps<"button"> & { pendente?: string }) {
  const { pending } = useFormStatus();
  return (
    <button {...botao} type="submit" disabled={pending || botao.disabled}>
      {pending && pendente ? pendente : children}
    </button>
  );
}
