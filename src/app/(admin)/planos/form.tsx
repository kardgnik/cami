"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AreaTexto, Campo, Erro, Selecao } from "@/components/form";
import { PERIODICIDADES } from "@/lib/labels";
import type { EstadoForm } from "@/lib/validations";

type Valores = {
  nome: string;
  descricao: string;
  valorCentavos: string;
  periodicidade: string;
  limiteMesas: string;
  /** "on" quando marcado (como chega do formulário). */
  grupoFechado?: string;
};

export function PlanoForm({
  acao,
  inicial,
}: {
  acao: (estado: EstadoForm, formData: FormData) => Promise<EstadoForm>;
  inicial: Valores;
}) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  const v = { ...inicial, ...estado.valores } as Valores;
  // caixa desmarcada não vem no formulário: depois de um erro vale o que foi enviado, não o valor inicial
  const grupoFechado = (estado.valores ? estado.valores.grupoFechado : inicial.grupoFechado) === "on";
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
      <Campo
        rotulo="Mesas incluídas"
        name="limiteMesas"
        type="number"
        min={1}
        max={50}
        required
        defaultValue={v.limiteMesas}
        erros={estado.erros?.limiteMesas}
        ajuda="Quantas mesas uma assinatura deste plano pode incluir."
        className="sm:max-w-48"
      />
      <label className="flex items-start gap-3 rounded-lg border border-slate-200 px-3 py-2.5 text-sm">
        <input
          type="checkbox"
          name="grupoFechado"
          defaultChecked={grupoFechado}
          className="mt-0.5 size-4 shrink-0 accent-indigo-600"
        />
        <span>
          <span className="block font-medium text-slate-800">Plano de grupo fechado</span>
          <span className="block text-xs text-slate-500">
            Ao vincular uma mesa a uma assinatura deste plano, a mesa fica sem vagas: só entram nela outros jogadores com
            plano de grupo fechado.
          </span>
        </span>
      </label>
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
