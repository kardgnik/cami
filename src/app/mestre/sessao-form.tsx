"use client";

import { useActionState, useState } from "react";
import { AreaTexto, Campo, Erro, Selecao } from "@/components/form";
import { formatarMoeda } from "@/lib/format";
import type { EstadoForm } from "@/lib/validations";
import { registrarSessao } from "./actions";

export type OpcaoMesa = { id: number; nome: string; tipo: string; valorSessaoCentavos: number };

export function SessaoForm({ mesas, hoje }: { mesas: OpcaoMesa[]; hoje: string }) {
  const [estado, enviar, pendente] = useActionState(registrarSessao, {} as EstadoForm);
  const [mesaId, setMesaId] = useState(mesas.length === 1 ? String(mesas[0].id) : "");
  const mesa = mesas.find((m) => String(m.id) === mesaId);
  const valorData = typeof estado.valores?.data === "string" ? estado.valores.data : hoje;
  const valorObs = typeof estado.valores?.observacoes === "string" ? estado.valores.observacoes : "";

  return (
    // a key muda a cada registro com sucesso, limpando o formulário (data volta para hoje)
    <form key={estado.sucesso ?? "form"} action={enviar} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Selecao
          rotulo="Mesa"
          name="mesaId"
          required
          defaultValue={mesaId}
          onChange={(e) => setMesaId(e.target.value)}
          erros={estado.erros?.mesaId}
        >
          <option value="">Selecione...</option>
          {mesas.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nome} ({m.tipo}) · {formatarMoeda(m.valorSessaoCentavos)}
            </option>
          ))}
        </Selecao>
        <Campo
          rotulo="Data da sessão"
          name="data"
          type="date"
          required
          max={hoje}
          defaultValue={valorData}
          erros={estado.erros?.data}
        />
      </div>
      <AreaTexto rotulo="Observações (opcional)" name="observacoes" defaultValue={valorObs} erros={estado.erros?.observacoes} />

      {mesa && (
        <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Você vai receber <strong className="text-emerald-700">{formatarMoeda(mesa.valorSessaoCentavos)}</strong> por esta
          sessão.
        </p>
      )}
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
