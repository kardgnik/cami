"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AreaTexto, Campo, Erro } from "@/components/form";
import type { EstadoForm } from "@/lib/validations";

type Valores = { nome: string; email: string; telefone: string; observacoes: string };

export function JogadorForm({
  acao,
  inicial,
  cancelarPara,
  rotuloSalvar = "Salvar",
}: {
  acao: (estado: EstadoForm, formData: FormData) => Promise<EstadoForm>;
  inicial: Valores;
  /** Se informado, mostra um botão Cancelar com este link. */
  cancelarPara?: string;
  rotuloSalvar?: string;
}) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  const v = { ...inicial, ...estado.valores } as Valores;
  return (
    <form action={enviar} className="cartao space-y-5 p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Nome" name="nome" required defaultValue={v.nome} erros={estado.erros?.nome} className="sm:col-span-2" />
        <Campo rotulo="Telefone" name="telefone" type="tel" required defaultValue={v.telefone} erros={estado.erros?.telefone} />
        <Campo rotulo="E-mail (opcional)" name="email" type="email" defaultValue={v.email} erros={estado.erros?.email} />
        <AreaTexto
          rotulo="Observações (opcional)"
          name="observacoes"
          defaultValue={v.observacoes}
          erros={estado.erros?.observacoes}
          className="sm:col-span-2"
        />
      </div>
      <Erro mensagem={estado.mensagem} />
      {estado.sucesso && (
        <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {estado.sucesso}
        </p>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={pendente} className="btn-primario">
          {pendente ? "Salvando..." : rotuloSalvar}
        </button>
        {cancelarPara && (
          <Link href={cancelarPara} className="btn-secundario">
            Cancelar
          </Link>
        )}
      </div>
    </form>
  );
}
