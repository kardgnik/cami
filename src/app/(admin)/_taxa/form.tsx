"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Campo, Erro } from "@/components/form";
import { calcularTaxa } from "@/lib/finance";
import { formatarMoeda, lerDecimal } from "@/lib/format";
import type { EstadoForm } from "@/lib/validations";

type Valores = { nome: string; taxaPercentualBp: string; taxaFixaCentavos: string };

const EXEMPLO = 10_000; // R$ 100,00

export function TaxaForm({
  acao,
  inicial,
  voltarPara,
}: {
  acao: (estado: EstadoForm, formData: FormData) => Promise<EstadoForm>;
  inicial: Valores;
  voltarPara: string;
}) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  const valores = { ...inicial, ...estado.valores } as Valores;
  const [previa, setPrevia] = useState({ pct: valores.taxaPercentualBp, fixo: valores.taxaFixaCentavos });

  const pct = previa.pct.trim() === "" ? 0 : lerDecimal(previa.pct);
  const fixo = previa.fixo.trim() === "" ? 0 : lerDecimal(previa.fixo);
  const taxaExemplo =
    pct !== null && fixo !== null ? calcularTaxa(EXEMPLO, { taxaPercentualBp: pct, taxaFixaCentavos: fixo }) : null;

  return (
    <form
      action={enviar}
      className="cartao max-w-xl space-y-5 p-6"
      onInput={(e) => {
        const f = new FormData(e.currentTarget);
        setPrevia({ pct: String(f.get("taxaPercentualBp") ?? ""), fixo: String(f.get("taxaFixaCentavos") ?? "") });
      }}
    >
      <Campo rotulo="Nome" name="nome" required defaultValue={valores.nome} erros={estado.erros?.nome} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          rotulo="Taxa percentual"
          name="taxaPercentualBp"
          inputMode="decimal"
          placeholder="0,00"
          sufixo="%"
          defaultValue={valores.taxaPercentualBp}
          erros={estado.erros?.taxaPercentualBp}
          ajuda="Sobre o valor de cada cobrança."
        />
        <Campo
          rotulo="Taxa fixa por cobrança"
          name="taxaFixaCentavos"
          inputMode="decimal"
          placeholder="0,00"
          prefixo="R$"
          defaultValue={valores.taxaFixaCentavos}
          erros={estado.erros?.taxaFixaCentavos}
          ajuda="Somada ao percentual."
        />
      </div>

      <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
        {taxaExemplo === null ? (
          "Preencha as taxas para ver uma simulação."
        ) : (
          <>
            Numa cobrança de <strong>{formatarMoeda(EXEMPLO)}</strong>, a taxa é{" "}
            <strong className="text-slate-900">{formatarMoeda(taxaExemplo)}</strong> e sobram{" "}
            <strong className="text-emerald-700">{formatarMoeda(EXEMPLO - taxaExemplo)}</strong>.
          </>
        )}
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
    </form>
  );
}
