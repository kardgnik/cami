"use client";

import { useActionState } from "react";
import type { EstadoForm } from "@/lib/validations";
import { FormAcao } from "@/components/form-acao";

/**
 * Botão que lança as mensalidades pendentes do mês. Fica montado mesmo sem
 * pendências, para a confirmação continuar na tela depois do lançamento.
 */
export function LancarMensalidades({
  acao,
  pendentes,
  mesFuturo,
  rotulo,
}: {
  acao: (estado: EstadoForm, formData: FormData) => Promise<EstadoForm>;
  pendentes: number;
  mesFuturo: boolean;
  rotulo: string;
}) {
  const [estado, enviar, pendente] = useActionState(acao, {} as EstadoForm);
  const aviso = estado.sucesso ?? estado.mensagem;
  if (pendentes === 0 && !aviso) return null;
  return (
    <FormAcao acao={enviar} className="flex flex-wrap items-center gap-3 border-t border-slate-100 px-4 py-3">
      {pendentes > 0 &&
        (mesFuturo ? (
          <p className="text-xs text-slate-500">Mensalidades de meses futuros ainda não podem ser lançadas.</p>
        ) : (
          <button type="submit" disabled={pendente} className="btn-primario whitespace-nowrap">
            {pendente ? "Lançando..." : rotulo}
          </button>
        ))}
      {aviso && (
        <p role="status" className={`text-sm ${estado.sucesso ? "text-emerald-700" : "text-slate-600"}`}>
          {aviso}
        </p>
      )}
    </FormAcao>
  );
}
