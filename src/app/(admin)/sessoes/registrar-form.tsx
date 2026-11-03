"use client";

import { useActionState, useRef, useState } from "react";
import { AreaTexto, Campo, Erro, Selecao } from "@/components/form";
import { formatarMoeda } from "@/lib/format";
import { registrarSessao } from "./actions";

export type OpcaoMesaSessao = { id: number; nome: string; mestreId: number | null; valorCentavos: number };
export type OpcaoMestreSessao = { id: number; nome: string };

export function RegistrarSessaoForm({
  mesas,
  mestres,
  hoje,
}: {
  mesas: OpcaoMesaSessao[];
  mestres: OpcaoMestreSessao[];
  hoje: string;
}) {
  const [estado, enviar, pendente] = useActionState(registrarSessao, {});
  const v = { mesaId: "", mestreId: "", data: hoje, observacoes: "", ...estado.valores } as Record<string, string>;
  const mestreRef = useRef<HTMLSelectElement>(null);
  const [mesaId, setMesaId] = useState(v.mesaId);
  const mesa = mesas.find((m) => String(m.id) === mesaId);

  return (
    <form
      action={enviar}
      className="cartao space-y-4 p-5"
      // após sucesso o React limpa os campos; zera também a prévia do valor
      key={estado.sucesso ?? "form"}
    >
      <h2 className="text-sm font-semibold text-slate-900">Registrar sessão</h2>
      <p className="-mt-2 text-xs text-slate-500">Lançamento do gerente em nome de um mestre.</p>
      <Selecao
        rotulo="Mesa"
        name="mesaId"
        required
        defaultValue={v.mesaId}
        erros={estado.erros?.mesaId}
        onChange={(e) => {
          const id = e.currentTarget.value;
          setMesaId(id);
          const escolhida = mesas.find((m) => String(m.id) === id);
          if (escolhida?.mestreId && mestreRef.current) mestreRef.current.value = String(escolhida.mestreId);
        }}
      >
        <option value="">Selecione...</option>
        {mesas.map((m) => (
          <option key={m.id} value={m.id}>
            {m.nome}
          </option>
        ))}
      </Selecao>
      <Selecao ref={mestreRef} rotulo="Mestre" name="mestreId" required defaultValue={v.mestreId} erros={estado.erros?.mestreId}>
        <option value="">Selecione...</option>
        {mestres.map((m) => (
          <option key={m.id} value={m.id}>
            {m.nome}
          </option>
        ))}
      </Selecao>
      <Campo rotulo="Data" name="data" type="date" required max={hoje} defaultValue={v.data} erros={estado.erros?.data} />
      <AreaTexto rotulo="Observações (opcional)" name="observacoes" defaultValue={v.observacoes} erros={estado.erros?.observacoes} />
      {mesa && (
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Valor a pagar ao mestre: <strong className="text-slate-900">{formatarMoeda(mesa.valorCentavos)}</strong>
        </p>
      )}
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
