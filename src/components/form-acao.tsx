"use client";

import { startTransition, type ComponentProps } from "react";

/**
 * Formulário ligado a uma ação de `useActionState` que NÃO é reiniciado depois do envio.
 *
 * Com `<form action={...}>`, o React reinicia o formulário ao fim de cada envio. Quando
 * a ação devolve um erro de validação, isso apagava o que a pessoa tinha escolhido em
 * menus (select com defaultValue) e caixas de seleção. Aqui o envio passa pela ação
 * sem esse reinício; para limpar o formulário depois de um sucesso, use `key`.
 */
export function FormAcao({
  acao,
  onSubmit,
  ...props
}: Omit<ComponentProps<"form">, "action"> & { acao: (dados: FormData) => void }) {
  return (
    <form
      {...props}
      onSubmit={(e) => {
        onSubmit?.(e);
        if (e.defaultPrevented) return;
        e.preventDefault();
        const dados = new FormData(e.currentTarget, e.nativeEvent.submitter);
        startTransition(() => acao(dados));
      }}
    />
  );
}
