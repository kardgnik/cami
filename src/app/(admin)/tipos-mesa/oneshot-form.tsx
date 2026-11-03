"use client";

import { useActionState } from "react";
import { Campo } from "@/components/form";
import type { EstadoForm } from "@/lib/validations";
import { salvarValorOneshot } from "./actions";

export function OneshotForm({ valorInicial }: { valorInicial: string }) {
  const [estado, enviar, pendente] = useActionState(salvarValorOneshot, {} as EstadoForm);
  const valor = typeof estado.valores?.valorOneshotCentavos === "string" ? estado.valores.valorOneshotCentavos : valorInicial;
  return (
    <form action={enviar} className="cartao mt-6 max-w-xl space-y-4 p-5">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">Oneshot paga</h2>
        <p className="mt-1 text-xs text-slate-500">
          Oneshots não têm mesa fixa: o mestre recebe este valor por oneshot registrada. Mudar o valor afeta só as oneshots
          registradas daqui em diante.
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <Campo
          rotulo="Valor por oneshot"
          name="valorOneshotCentavos"
          inputMode="decimal"
          prefixo="R$"
          required
          defaultValue={valor}
          erros={estado.erros?.valorOneshotCentavos}
          className="w-48"
        />
        <button type="submit" disabled={pendente} className="btn-primario">
          {pendente ? "Salvando..." : "Salvar"}
        </button>
      </div>
      {estado.sucesso && (
        <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {estado.sucesso}
        </p>
      )}
    </form>
  );
}
