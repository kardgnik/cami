"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Campo, Erro } from "@/components/form";
import type { EstadoForm } from "@/lib/validations";

type Valores = { nome: string; valorSessaoCentavos: string };

export function TipoMesaForm({
  acao,
  inicial,
}: {
  acao: (estado: EstadoForm, formData: FormData) => Promise<EstadoForm>;
  inicial: Valores;
}) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  const v = { ...inicial, ...estado.valores } as Valores;
  return (
    <form action={enviar} className="cartao max-w-xl space-y-5 p-6">
      <Campo rotulo="Nome" name="nome" required defaultValue={v.nome} erros={estado.erros?.nome} />
      <Campo
        rotulo="Valor pago ao mestre por sessão"
        name="valorSessaoCentavos"
        inputMode="decimal"
        placeholder="0,00"
        prefixo="R$"
        required
        defaultValue={v.valorSessaoCentavos}
        erros={estado.erros?.valorSessaoCentavos}
        ajuda="Usado pelas mesas deste tipo que não têm valor próprio."
      />
      <Erro mensagem={estado.mensagem} />
      <div className="flex gap-2">
        <button type="submit" disabled={pendente} className="btn-primario">
          {pendente ? "Salvando..." : "Salvar"}
        </button>
        <Link href="/tipos-mesa" className="btn-secundario">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
