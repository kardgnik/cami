"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { AreaTexto, Campo, Erro, ErrosCampo, Selecao } from "@/components/form";
import { calcularLiquido, type Periodicidade, type Taxa } from "@/lib/finance";
import { descreverTaxa, formatarMoeda } from "@/lib/format";
import { rotuloPeriodicidade, STATUS, sufixoPeriodicidade } from "@/lib/labels";
import type { EstadoForm } from "@/lib/validations";
import type { OpcaoMesa } from "./_opcoes";

export type OpcaoPlano = {
  id: number;
  nome: string;
  valorCentavos: number;
  periodicidade: Periodicidade;
  limiteMesas: number;
  ativo: boolean;
};
export type OpcaoTaxa = Taxa & { id: number; nome: string; ativo: boolean };

type Valores = {
  status: string;
  dataInicio: string;
  observacoes: string;
  planoId: string;
  plataformaId: string;
  metodoPagamentoId: string;
  mesaIds: string[];
};

export function AssinaturaForm({
  acao,
  inicial,
  planos,
  plataformas,
  metodos,
  mesas,
  voltarPara,
}: {
  acao: (estado: EstadoForm, formData: FormData) => Promise<EstadoForm>;
  inicial: Valores;
  planos: OpcaoPlano[];
  plataformas: OpcaoTaxa[];
  metodos: OpcaoTaxa[];
  mesas: OpcaoMesa[];
  voltarPara: string;
}) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  const v = { ...inicial, ...estado.valores } as Valores;
  const [sel, setSel] = useState({
    planoId: v.planoId,
    plataformaId: v.plataformaId,
    metodoPagamentoId: v.metodoPagamentoId,
    status: v.status,
  });
  const [marcadas, setMarcadas] = useState<Set<number>>(() => new Set((v.mesaIds ?? []).map(Number)));

  const plano = planos.find((p) => String(p.id) === sel.planoId);
  const plataforma = plataformas.find((p) => String(p.id) === sel.plataformaId);
  const metodo = metodos.find((m) => String(m.id) === sel.metodoPagamentoId);
  const r = plano && plataforma && metodo ? calcularLiquido(plano.valorCentavos, plataforma, metodo) : null;

  const limite = plano?.limiteMesas;
  const noLimite = limite !== undefined && marcadas.size >= limite;
  const acimaDoLimite = limite !== undefined && marcadas.size > limite;
  const ocupa = sel.status !== "CANCELADO";

  const rotulo = (nome: string, ativo: boolean) => (ativo ? nome : `${nome} (inativo)`);

  function alternar(id: number) {
    setMarcadas((atual) => {
      const nova = new Set(atual);
      if (nova.has(id)) nova.delete(id);
      else nova.add(id);
      return nova;
    });
  }

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
          status: String(f.get("status") ?? ""),
        });
      }}
    >
      <div className="cartao min-w-0 space-y-5 p-6">
        <fieldset className="grid gap-4 sm:grid-cols-3">
          <legend className="sr-only">Assinatura</legend>
          <Selecao rotulo="Plano" name="planoId" required defaultValue={v.planoId} erros={estado.erros?.planoId}>
            <option value="">Selecione...</option>
            {planos.map((p) => (
              <option key={p.id} value={p.id}>
                {rotulo(p.nome, p.ativo)} · {formatarMoeda(p.valorCentavos)}
                {sufixoPeriodicidade(p.periodicidade)} · {p.limiteMesas} mesa{p.limiteMesas === 1 ? "" : "s"}
              </option>
            ))}
          </Selecao>
          <Selecao
            rotulo="Plataforma de origem"
            name="plataformaId"
            required
            defaultValue={v.plataformaId}
            erros={estado.erros?.plataformaId}
          >
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

        <fieldset className="border-t border-slate-100 pt-5">
          <legend className="sr-only">Mesas</legend>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-medium text-slate-700">Mesas</h2>
            <p className={`text-xs ${acimaDoLimite ? "font-medium text-red-600" : "text-slate-500"}`}>
              {limite === undefined
                ? "Escolha o plano para ver quantas mesas ele inclui."
                : `${marcadas.size} de ${limite} mesa${limite === 1 ? "" : "s"} do plano`}
              {acimaDoLimite && ` — desmarque ${marcadas.size - limite!}`}
            </p>
          </div>
          {mesas.length === 0 ? (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">
              Nenhuma mesa ativa.{" "}
              <Link href="/mesas/novo" className="link">
                Crie uma mesa
              </Link>{" "}
              para vincular jogadores.
            </p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {mesas.map((m) => {
                const marcada = marcadas.has(m.id);
                const cheia = m.ocupacaoOutras >= m.capacidade && !m.vinculada;
                const desabilitada = !marcada && (cheia || noLimite);
                const ocupacao = m.ocupacaoOutras + (marcada && ocupa ? 1 : 0);
                return (
                  <li key={m.id}>
                    <label
                      className={`flex h-full items-start gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                        marcada
                          ? "border-indigo-300 bg-indigo-50"
                          : desabilitada
                            ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
                            : "cursor-pointer border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        name="mesaIds[]"
                        value={m.id}
                        checked={marcada}
                        disabled={desabilitada}
                        onChange={() => alternar(m.id)}
                        className="mt-0.5 size-4 shrink-0 accent-indigo-600"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">
                          {rotulo(m.nome, m.ativo)}{" "}
                          <span className="text-xs font-normal text-slate-500">· {m.tipo}</span>
                        </span>
                        <span className="block text-xs text-slate-500">
                          {m.mestre ? `Mestre: ${m.mestre}` : "Sem mestre"} ·{" "}
                          <span className={ocupacao >= m.capacidade ? "font-medium text-amber-700" : ""}>
                            {ocupacao}/{m.capacidade} vagas
                          </span>
                          {cheia && " · cheia"}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
          <ErrosCampo erros={estado.erros?.mesaIds} />
          {(estado.erros?.mesaIds?.length ?? 0) > 1 && (
            <ul className="mt-1 list-inside list-disc text-xs text-red-600">
              {estado.erros!.mesaIds!.slice(1).map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
        </fieldset>

        <div className="grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
          <Selecao rotulo="Status" name="status" defaultValue={v.status} erros={estado.erros?.status}>
            {STATUS.map((s) => (
              <option key={s.valor} value={s.valor}>
                {s.rotulo}
              </option>
            ))}
          </Selecao>
          <Campo
            rotulo="Início da assinatura"
            name="dataInicio"
            type="date"
            required
            defaultValue={v.dataInicio}
            erros={estado.erros?.dataInicio}
          />
          <AreaTexto
            rotulo="Observações (opcional)"
            name="observacoes"
            defaultValue={v.observacoes}
            erros={estado.erros?.observacoes}
            className="sm:col-span-2"
          />
        </div>

        <Erro mensagem={estado.mensagem} />

        <div className="flex gap-2">
          <button type="submit" disabled={pendente} className="btn-primario">
            {pendente ? "Salvando..." : "Salvar"}
          </button>
          <Link href={voltarPara} className="btn-secundario">
            Cancelar
          </Link>
        </div>
      </div>

      <aside className="cartao h-fit p-5 lg:sticky lg:top-8" aria-live="polite">
        <h2 className="text-sm font-semibold text-slate-900">Valor por cobrança</h2>
        {r && plano && plataforma && metodo ? (
          <dl className="mt-3 space-y-2 text-sm">
            <Linha rotulo="Valor do plano" valor={formatarMoeda(r.bruto)} />
            <Linha rotulo={`Taxa ${plataforma.nome}`} valor={`− ${formatarMoeda(r.taxaPlataforma)}`} fraco />
            <Linha rotulo={`Taxa ${metodo.nome}`} valor={`− ${formatarMoeda(r.taxaMetodo)}`} fraco />
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
            <p className="pt-1 text-xs text-slate-500">
              Cobrança {rotuloPeriodicidade(plano.periodicidade).toLowerCase()}.
            </p>
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
