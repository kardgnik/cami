"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { AreaTexto, Campo, Erro, Selecao } from "@/components/form";
import { calcularLiquido, type Periodicidade, type Taxa } from "@/lib/finance";
import { descreverTaxa, formatarMoeda } from "@/lib/format";
import { rotuloPeriodicidade, STATUS, sufixoPeriodicidade } from "@/lib/labels";
import type { EstadoForm } from "@/lib/validations";

export type OpcaoPlano = { id: number; nome: string; valorCentavos: number; periodicidade: Periodicidade; ativo: boolean };
export type OpcaoTaxa = Taxa & { id: number; nome: string; ativo: boolean };

type Valores = {
  nome: string;
  email: string;
  telefone: string;
  status: string;
  dataInicio: string;
  observacoes: string;
  planoId: string;
  plataformaId: string;
  metodoPagamentoId: string;
};

export function AssinanteForm({
  acao,
  inicial,
  planos,
  plataformas,
  metodos,
}: {
  acao: (estado: EstadoForm, formData: FormData) => Promise<EstadoForm>;
  inicial: Valores;
  planos: OpcaoPlano[];
  plataformas: OpcaoTaxa[];
  metodos: OpcaoTaxa[];
}) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  const v = { ...inicial, ...estado.valores } as Valores;
  const [sel, setSel] = useState({ planoId: v.planoId, plataformaId: v.plataformaId, metodoPagamentoId: v.metodoPagamentoId });

  const plano = planos.find((p) => String(p.id) === sel.planoId);
  const plataforma = plataformas.find((p) => String(p.id) === sel.plataformaId);
  const metodo = metodos.find((m) => String(m.id) === sel.metodoPagamentoId);
  const r = plano && plataforma && metodo ? calcularLiquido(plano.valorCentavos, plataforma, metodo) : null;

  const rotulo = (nome: string, ativo: boolean) => (ativo ? nome : `${nome} (inativo)`);

  return (
    <form
      action={enviar}
      className="grid gap-6 lg:grid-cols-[1fr_20rem]"
      onChange={(e) => {
        const f = new FormData(e.currentTarget);
        setSel({
          planoId: String(f.get("planoId") ?? ""),
          plataformaId: String(f.get("plataformaId") ?? ""),
          metodoPagamentoId: String(f.get("metodoPagamentoId") ?? ""),
        });
      }}
    >
      <div className="cartao space-y-5 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Nome" name="nome" required defaultValue={v.nome} erros={estado.erros?.nome} className="sm:col-span-2" />
          <Campo rotulo="E-mail" name="email" type="email" required defaultValue={v.email} erros={estado.erros?.email} />
          <Campo rotulo="Telefone (opcional)" name="telefone" type="tel" defaultValue={v.telefone} erros={estado.erros?.telefone} />
        </div>

        <fieldset className="grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-3">
          <legend className="sr-only">Assinatura</legend>
          <Selecao rotulo="Plano" name="planoId" required defaultValue={v.planoId} erros={estado.erros?.planoId}>
            <option value="">Selecione...</option>
            {planos.map((p) => (
              <option key={p.id} value={p.id}>
                {rotulo(p.nome, p.ativo)} · {formatarMoeda(p.valorCentavos)}
                {sufixoPeriodicidade(p.periodicidade)}
              </option>
            ))}
          </Selecao>
          <Selecao rotulo="Plataforma de origem" name="plataformaId" required defaultValue={v.plataformaId} erros={estado.erros?.plataformaId}>
            <option value="">Selecione...</option>
            {plataformas.map((p) => (
              <option key={p.id} value={p.id}>
                {rotulo(p.nome, p.ativo)} · {descreverTaxa(p)}
              </option>
            ))}
          </Selecao>
          <Selecao
            rotulo="Método de pagamento"
            name="metodoPagamentoId"
            required
            defaultValue={v.metodoPagamentoId}
            erros={estado.erros?.metodoPagamentoId}
          >
            <option value="">Selecione...</option>
            {metodos.map((m) => (
              <option key={m.id} value={m.id}>
                {rotulo(m.nome, m.ativo)} · {descreverTaxa(m)}
              </option>
            ))}
          </Selecao>
        </fieldset>

        <div className="grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
          <Selecao rotulo="Status" name="status" defaultValue={v.status} erros={estado.erros?.status}>
            {STATUS.map((s) => (
              <option key={s.valor} value={s.valor}>
                {s.rotulo}
              </option>
            ))}
          </Selecao>
          <Campo rotulo="Início da assinatura" name="dataInicio" type="date" required defaultValue={v.dataInicio} erros={estado.erros?.dataInicio} />
          <AreaTexto rotulo="Observações (opcional)" name="observacoes" defaultValue={v.observacoes} erros={estado.erros?.observacoes} className="sm:col-span-2" />
        </div>

        <Erro mensagem={estado.mensagem} />

        <div className="flex gap-2">
          <button type="submit" disabled={pendente} className="btn-primario">
            {pendente ? "Salvando..." : "Salvar"}
          </button>
          <Link href="/assinantes" className="btn-secundario">
            Cancelar
          </Link>
        </div>
      </div>

      <aside className="cartao h-fit p-5 lg:sticky lg:top-8" aria-live="polite">
        <h2 className="text-sm font-semibold text-slate-900">Valor por cobrança</h2>
        {r && plano ? (
          <dl className="mt-3 space-y-2 text-sm">
            <Linha rotulo="Valor do plano" valor={formatarMoeda(r.bruto)} />
            <Linha rotulo={`Taxa ${plataforma!.nome}`} valor={`− ${formatarMoeda(r.taxaPlataforma)}`} fraco />
            <Linha rotulo={`Taxa ${metodo!.nome}`} valor={`− ${formatarMoeda(r.taxaMetodo)}`} fraco />
            <div className="border-t border-slate-200 pt-2">
              <Linha
                rotulo="Líquido"
                valor={formatarMoeda(r.liquido)}
                destaque={r.liquido > 0 ? "text-emerald-700" : "text-red-600"}
              />
            </div>
            {r.liquido <= 0 && (
              <p className="rounded-md bg-red-50 px-2 py-1.5 text-xs text-red-700">
                As taxas consomem todo o valor desta assinatura.
              </p>
            )}
            <p className="pt-1 text-xs text-slate-500">Cobrança {rotuloPeriodicidade(plano.periodicidade).toLowerCase()}.</p>
          </dl>
        ) : (
          <p className="mt-2 text-sm text-slate-500">Escolha plano, plataforma e método para ver o valor líquido.</p>
        )}
      </aside>
    </form>
  );
}

function Linha({ rotulo, valor, fraco, destaque }: { rotulo: string; valor: string; fraco?: boolean; destaque?: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className={fraco ? "text-slate-500" : "font-medium text-slate-700"}>{rotulo}</dt>
      <dd className={`tabular-nums ${destaque ? `font-semibold ${destaque}` : fraco ? "text-slate-500" : "text-slate-900"}`}>
        {valor}
      </dd>
    </div>
  );
}
