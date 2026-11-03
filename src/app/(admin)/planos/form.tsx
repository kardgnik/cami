"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AreaTexto, Campo, Erro, Selecao } from "@/components/form";
import { PERIODICIDADES } from "@/lib/labels";
import type { EstadoForm } from "@/lib/validations";

type Valores = { nome: string; descricao: string; valorCentavos: string; periodicidade: string };

export function PlanoForm({
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
      <Campo rotulo="Nome do plano" name="nome" required defaultValue={v.nome} erros={estado.erros?.nome} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          rotulo="Valor por cobrança"
          name="valorCentavos"
          inputMode="decimal"
          placeholder="0,00"
          prefixo="R$"
          required
          defaultValue={v.valorCentavos}
          erros={estado.erros?.valorCentavos}
        />
        <Selecao
          rotulo="Periodicidade"
          name="periodicidade"
          defaultValue={v.periodicidade}
          erros={estado.erros?.periodicidade}
        >
          {PERIODICIDADES.map((p) => (
            <option key={p.valor} value={p.valor}>
              {p.rotulo}
            </option>
          ))}
        </Selecao>
      </div>
      <AreaTexto rotulo="Descrição (opcional)" name="descricao" defaultValue={v.descricao} erros={estado.erros?.descricao} />
      <Erro mensagem={estado.mensagem} />
      <div className="flex gap-2">
        <button type="submit" disabled={pendente} className="btn-primario">
          {pendente ? "Salvando..." : "Salvar"}
        </button>
        <Link href="/planos" className="btn-secundario">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
