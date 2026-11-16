"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Campo, Erro, Selecao } from "@/components/form";
import { PAGAMENTOS_MESTRE, type PagamentoMestre } from "@/lib/labels";
import type { EstadoForm } from "@/lib/validations";
import { FormAcao } from "@/components/form-acao";

type Valores = { nome: string; pagamentoMestre: string; valorSessaoCentavos: string; valorAlunoCentavos: string };

export function TipoMesaForm({
  acao,
  inicial,
}: {
  acao: (estado: EstadoForm, formData: FormData) => Promise<EstadoForm>;
  inicial: Valores;
}) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  const v = { ...inicial, ...estado.valores } as Valores;
  const [pagamento, setPagamento] = useState(v.pagamentoMestre as PagamentoMestre);
  const porAluno = pagamento === "POR_ALUNO";

  return (
    <FormAcao acao={enviar} className="cartao max-w-xl space-y-5 p-6">
      <Campo rotulo="Nome" name="nome" required defaultValue={v.nome} erros={estado.erros?.nome} />
      <div>
        <Selecao
          rotulo="Como o mestre é pago"
          name="pagamentoMestre"
          value={pagamento}
          onChange={(e) => setPagamento(e.target.value as PagamentoMestre)}
          erros={estado.erros?.pagamentoMestre}
        >
          {PAGAMENTOS_MESTRE.map((p) => (
            <option key={p.valor} value={p.valor}>
              {p.rotulo}
            </option>
          ))}
        </Selecao>
        <p className="mt-1 text-xs text-slate-500">{PAGAMENTOS_MESTRE.find((p) => p.valor === pagamento)?.ajuda}</p>
      </div>

      {/* O valor do outro modo segue no formulário, escondido, para não se perder ao trocar o modo. */}
      {porAluno ? (
        <>
          <Campo
            key="aluno"
            rotulo="Valor pago ao mestre por aluno, por mês"
            name="valorAlunoCentavos"
            inputMode="decimal"
            placeholder="0,00"
            prefixo="R$"
            required
            defaultValue={v.valorAlunoCentavos}
            erros={estado.erros?.valorAlunoCentavos}
            ajuda="Usado pelas mesas deste tipo que não têm valor próprio. Ex.: 3 alunos × R$ 200,00 = R$ 600,00 por mês."
          />
          <input type="hidden" name="valorSessaoCentavos" value={v.valorSessaoCentavos} />
        </>
      ) : (
        <>
          <Campo
            key="sessao"
            rotulo="Valor pago ao mestre por sessão"
            name="valorSessaoCentavos"
            inputMode="decimal"
            placeholder="0,00"
            prefixo="R$"
            required
            defaultValue={v.valorSessaoCentavos}
            erros={estado.erros?.valorSessaoCentavos}
            ajuda="Usado pelas mesas deste tipo que não têm valor próprio."
          />
          <input type="hidden" name="valorAlunoCentavos" value={v.valorAlunoCentavos} />
        </>
      )}
      <Erro mensagem={estado.mensagem} />
      <div className="flex gap-2">
        <button type="submit" disabled={pendente} className="btn-primario">
          {pendente ? "Salvando..." : "Salvar"}
        </button>
        <Link href="/tipos-mesa" className="btn-secundario">
          Cancelar
        </Link>
      </div>
    </FormAcao>
  );
}
