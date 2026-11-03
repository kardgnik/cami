"use client";

import { useState } from "react";
import { AreaTexto, Campo, ErrosCampo, Selecao } from "@/components/form";
import { valorDaSessao, type TipoSessao } from "@/lib/finance";
import { formatarMoeda } from "@/lib/format";
import { TIPOS_SESSAO } from "@/lib/labels";
import type { EstadoForm } from "@/lib/validations";

export type OpcaoMesaSessao = { id: number; nome: string; detalhe?: string; valorCentavos: number; mestreId?: number | null };

/**
 * Campos do registro de sessão, comuns ao painel do mestre e ao do gerente:
 * tipo (como no formulário que os mestres já usavam), mesa ou nome da oneshot,
 * data, data reposta (reposição) e observações, com prévia do valor.
 */
export function CamposSessao({
  estado,
  mesas,
  valorOneshotCentavos,
  hoje,
  onMesa,
  rotuloValor = "Você vai receber",
}: {
  estado: EstadoForm;
  mesas: OpcaoMesaSessao[];
  valorOneshotCentavos: number;
  hoje: string;
  onMesa?: (mesa: OpcaoMesaSessao | undefined) => void;
  rotuloValor?: string;
}) {
  const v = (k: string) => (typeof estado.valores?.[k] === "string" ? (estado.valores[k] as string) : undefined);
  const [tipo, setTipo] = useState<TipoSessao>((v("tipo") as TipoSessao) ?? "NORMAL");
  const [mesaId, setMesaId] = useState(v("mesaId") ?? (mesas.length === 1 ? String(mesas[0].id) : ""));
  const mesa = mesas.find((m) => String(m.id) === mesaId);
  const oneshot = tipo === "ONESHOT";
  const reposicao = tipo === "REPOSICAO";
  const valor = oneshot ? valorOneshotCentavos : mesa ? valorDaSessao(tipo, mesa.valorCentavos, valorOneshotCentavos) : null;

  return (
    <>
      <fieldset>
        <legend className="mb-2 block text-sm font-medium text-slate-700">Tipo de sessão</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {TIPOS_SESSAO.map((t) => (
            <label
              key={t.valor}
              className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                tipo === t.valor ? "border-indigo-400 bg-indigo-50" : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <input
                type="radio"
                name="tipo"
                value={t.valor}
                checked={tipo === t.valor}
                onChange={() => setTipo(t.valor)}
                className="mt-0.5 size-4 shrink-0 accent-indigo-600"
              />
              <span>
                <span className="block font-medium text-slate-800">{t.rotulo}</span>
                <span className="block text-xs text-slate-500">{t.ajuda}</span>
              </span>
            </label>
          ))}
        </div>
        <ErrosCampo erros={estado.erros?.tipo} />
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        {oneshot ? (
          <Campo
            rotulo="Nome da oneshot"
            name="nomeOneshot"
            required
            defaultValue={v("nomeOneshot")}
            erros={estado.erros?.nomeOneshot}
            placeholder="Ex.: O Templo Submerso"
          />
        ) : (
          <Selecao
            rotulo="Mesa"
            name="mesaId"
            required
            value={mesaId}
            onChange={(e) => {
              setMesaId(e.target.value);
              onMesa?.(mesas.find((m) => String(m.id) === e.target.value));
            }}
            erros={estado.erros?.mesaId}
          >
            <option value="">Selecione...</option>
            {mesas.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
                {m.detalhe ? ` (${m.detalhe})` : ""} · {formatarMoeda(m.valorCentavos)}
              </option>
            ))}
          </Selecao>
        )}
        <Campo
          rotulo={reposicao ? "Data em que a reposição aconteceu" : "Data da sessão"}
          name="data"
          type="date"
          required
          max={hoje}
          defaultValue={v("data") ?? hoje}
          erros={estado.erros?.data}
        />
        {reposicao && (
          <Campo
            rotulo="Data da sessão que está sendo reposta"
            name="dataReferencia"
            type="date"
            required
            max={hoje}
            defaultValue={v("dataReferencia")}
            erros={estado.erros?.dataReferencia}
            className="sm:col-start-2"
          />
        )}
      </div>

      <AreaTexto rotulo="Observações (opcional)" name="observacoes" defaultValue={v("observacoes")} erros={estado.erros?.observacoes} />

      {valor !== null && (
        <p className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
          {rotuloValor}: <strong className="text-emerald-700">{formatarMoeda(valor)}</strong>
          {tipo === "DUPLA" && " (sessão dupla: o dobro do valor da mesa)"}
          {oneshot && " (valor padrão da oneshot)"}.
        </p>
      )}
    </>
  );
}
