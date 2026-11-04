"use client";

import { useState } from "react";
import { AreaTexto, Campo, Selecao } from "@/components/form";
import { valorDaSessao, type TipoSessao } from "@/lib/finance";
import { formatarMoeda } from "@/lib/format";
import { TIPOS_SESSAO } from "@/lib/labels";
import type { EstadoForm } from "@/lib/validations";

export type OpcaoMesaSessao = { id: number; nome: string; detalhe?: string; valorCentavos: number; mestreId?: number | null };

/**
 * Campos do registro de sessão, comuns ao painel do mestre e ao do gerente:
 * tipo (menu com as opções do formulário que os mestres já usavam), mesa ou nome da oneshot,
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
      <div>
        <Selecao
          rotulo="Tipo de sessão"
          name="tipo"
          value={tipo}
          onChange={(e) => setTipo(e.target.value as TipoSessao)}
          erros={estado.erros?.tipo}
        >
          {TIPOS_SESSAO.map((t) => (
            <option key={t.valor} value={t.valor}>
              {t.rotulo}
            </option>
          ))}
        </Selecao>
        <p className="mt-1 text-xs text-slate-500">{TIPOS_SESSAO.find((t) => t.valor === tipo)?.ajuda}</p>
      </div>

      {/* @container: lado a lado só quando o próprio formulário tem espaço (no painel lateral, empilha) */}
      <div className="@container">
        <div className="grid gap-4 @md:grid-cols-2">
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
              className="@md:col-start-2"
            />
          )}
        </div>
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
