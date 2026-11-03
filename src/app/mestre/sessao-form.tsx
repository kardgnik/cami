"use client";

import { useActionState } from "react";
import { CamposSessao, type OpcaoMesaSessao } from "@/components/campos-sessao";
import { Erro } from "@/components/form";
import type { EstadoForm } from "@/lib/validations";
import { registrarSessao } from "./actions";

export function SessaoForm({
  mesas,
  hoje,
  valorOneshotCentavos,
}: {
  mesas: OpcaoMesaSessao[];
  hoje: string;
  valorOneshotCentavos: number;
}) {
  const [estado, enviar, pendente] = useActionState(registrarSessao, {} as EstadoForm);
  return (
    // a key muda a cada registro com sucesso, limpando o formulário (data volta para hoje)
    <form key={estado.sucesso ?? "form"} action={enviar} className="space-y-4">
      <CamposSessao estado={estado} mesas={mesas} hoje={hoje} valorOneshotCentavos={valorOneshotCentavos} />
      <Erro mensagem={estado.mensagem} />
      {estado.sucesso && (
        <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {estado.sucesso}
        </p>
      )}
      <button type="submit" disabled={pendente} className="btn-primario w-full sm:w-auto">
        {pendente ? "Registrando..." : "Registrar sessão"}
      </button>
    </form>
  );
}
