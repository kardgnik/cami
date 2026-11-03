"use client";

import { useActionState, useRef } from "react";
import { CamposSessao, type OpcaoMesaSessao } from "@/components/campos-sessao";
import { Erro, Selecao } from "@/components/form";
import type { EstadoForm } from "@/lib/validations";
import { registrarSessao } from "./actions";

export type OpcaoMestreSessao = { id: number; nome: string };

export function RegistrarSessaoForm({
  mesas,
  mestres,
  hoje,
  valorOneshotCentavos,
}: {
  mesas: OpcaoMesaSessao[];
  mestres: OpcaoMestreSessao[];
  hoje: string;
  valorOneshotCentavos: number;
}) {
  const [estado, enviar, pendente] = useActionState(registrarSessao, {} as EstadoForm);
  const mestreRef = useRef<HTMLSelectElement>(null);
  const mestreInicial = typeof estado.valores?.mestreId === "string" ? estado.valores.mestreId : "";

  return (
    // após sucesso a key muda e o formulário volta limpo
    <form action={enviar} className="cartao space-y-4 p-5" key={estado.sucesso ?? "form"}>
      <h2 className="text-sm font-semibold text-slate-900">Registrar sessão</h2>
      <p className="-mt-2 text-xs text-slate-500">Lançamento do gerente em nome de um mestre.</p>
      <CamposSessao
        estado={estado}
        mesas={mesas}
        hoje={hoje}
        valorOneshotCentavos={valorOneshotCentavos}
        rotuloValor="Valor a pagar ao mestre"
        onMesa={(m) => {
          // pré-seleciona o mestre da mesa escolhida
          if (m?.mestreId && mestreRef.current) mestreRef.current.value = String(m.mestreId);
        }}
      />
      <Selecao ref={mestreRef} rotulo="Mestre" name="mestreId" required defaultValue={mestreInicial} erros={estado.erros?.mestreId}>
        <option value="">Selecione...</option>
        {mestres.map((m) => (
          <option key={m.id} value={m.id}>
            {m.nome}
          </option>
        ))}
      </Selecao>
      <Erro mensagem={estado.mensagem} />
      {estado.sucesso && (
        <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {estado.sucesso}
        </p>
      )}
      <button type="submit" disabled={pendente} className="btn-primario w-full">
        {pendente ? "Registrando..." : "Registrar sessão"}
      </button>
    </form>
  );
}
