"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { AreaTexto, Campo, Erro, Selecao } from "@/components/form";
import { formatarMoeda, paraInput } from "@/lib/format";
import { DIAS_SEMANA, type PagamentoMestre } from "@/lib/labels";
import type { EstadoForm } from "@/lib/validations";
import { FormAcao } from "@/components/form-acao";

type Valores = {
  nome: string;
  descricao: string;
  tipoMesaId: string;
  mestreId: string;
  mestre2Id: string;
  valorSessaoCentavos: string;
  valorAlunoCentavos: string;
  diaSemana: string;
  sessoesPorMes: string;
  capacidade: string;
};

export type OpcaoTipo = {
  id: number;
  nome: string;
  pagamentoMestre: PagamentoMestre;
  valorSessaoCentavos: number;
  valorAlunoCentavos: number;
};
export type OpcaoMestre = { id: number; nome: string; ativo: boolean };

export function MesaForm({
  acao,
  inicial,
  tipos,
  mestres,
}: {
  acao: (estado: EstadoForm, formData: FormData) => Promise<EstadoForm>;
  inicial: Valores;
  tipos: OpcaoTipo[];
  mestres: OpcaoMestre[];
}) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  const v = { ...inicial, ...estado.valores } as Valores;
  const [tipoId, setTipoId] = useState(v.tipoMesaId);
  const tipo = tipos.find((t) => String(t.id) === tipoId);
  const porAluno = tipo?.pagamentoMestre === "POR_ALUNO";

  return (
    <FormAcao acao={enviar} className="cartao max-w-2xl space-y-5 p-6">
      <Campo rotulo="Nome da mesa" name="nome" required defaultValue={v.nome} erros={estado.erros?.nome} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Selecao
          rotulo="Tipo"
          name="tipoMesaId"
          required
          defaultValue={v.tipoMesaId}
          erros={estado.erros?.tipoMesaId}
          onChange={(e) => setTipoId(e.currentTarget.value)}
        >
          <option value="">Selecione...</option>
          {tipos.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nome} ·{" "}
              {t.pagamentoMestre === "POR_ALUNO"
                ? `${formatarMoeda(t.valorAlunoCentavos)}/aluno por mês`
                : `${formatarMoeda(t.valorSessaoCentavos)}/sessão`}
            </option>
          ))}
        </Selecao>
        <Selecao rotulo="Mestre" name="mestreId" defaultValue={v.mestreId} erros={estado.erros?.mestreId}>
          <option value="">Sem mestre</option>
          {mestres.map((m) => (
            <option key={m.id} value={m.id}>
              {m.ativo ? m.nome : `${m.nome} (inativo)`}
            </option>
          ))}
        </Selecao>
      </div>
      {porAluno ? (
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          Mesas pagas por aluno têm um só mestre.
          {v.mestre2Id && " Ao salvar, o segundo mestre desta mesa será removido."}
        </p>
      ) : (
        <Selecao
          rotulo="Segundo mestre (opcional)"
          name="mestre2Id"
          defaultValue={v.mestre2Id}
          erros={estado.erros?.mestre2Id}
          className="sm:max-w-[calc(50%-0.5rem)]"
        >
          <option value="">Nenhum</option>
          {mestres.map((m) => (
            <option key={m.id} value={m.id}>
              {m.ativo ? m.nome : `${m.nome} (inativo)`}
            </option>
          ))}
        </Selecao>
      )}
      {!porAluno && (
        <p className="-mt-3 text-xs text-slate-500">
          Com dois mestres, eles mestram juntos: a sessão é registrada uma vez e cada um recebe o valor cheio.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* O valor do outro modo de pagamento segue escondido, para não se perder ao trocar o tipo. */}
        {porAluno ? (
          <>
            <Campo
              key="aluno"
              rotulo="Valor por aluno, por mês (opcional)"
              name="valorAlunoCentavos"
              inputMode="decimal"
              prefixo="R$"
              placeholder={paraInput(tipo.valorAlunoCentavos)}
              defaultValue={v.valorAlunoCentavos}
              erros={estado.erros?.valorAlunoCentavos}
              ajuda={`Vazio = valor do tipo (${formatarMoeda(tipo.valorAlunoCentavos)}). O mestre recebe por aluno, não por sessão.`}
            />
            <input type="hidden" name="valorSessaoCentavos" value={v.valorSessaoCentavos} />
          </>
        ) : (
          <>
            <Campo
              key="sessao"
              rotulo="Valor por sessão (opcional)"
              name="valorSessaoCentavos"
              inputMode="decimal"
              prefixo="R$"
              placeholder={tipo ? paraInput(tipo.valorSessaoCentavos) : "0,00"}
              defaultValue={v.valorSessaoCentavos}
              erros={estado.erros?.valorSessaoCentavos}
              ajuda={tipo ? `Vazio = valor do tipo (${formatarMoeda(tipo.valorSessaoCentavos)}).` : "Vazio = valor do tipo."}
            />
            <input type="hidden" name="valorAlunoCentavos" value={v.valorAlunoCentavos} />
          </>
        )}
        <Selecao rotulo="Dia da semana (opcional)" name="diaSemana" defaultValue={v.diaSemana} erros={estado.erros?.diaSemana}>
          <option value="">Não definido</option>
          {DIAS_SEMANA.map((d) => (
            <option key={d.valor} value={d.valor}>
              {d.rotulo}
            </option>
          ))}
        </Selecao>
        <Campo
          rotulo="Sessões por mês"
          name="sessoesPorMes"
          type="number"
          min={0}
          max={31}
          required
          defaultValue={v.sessoesPorMes}
          erros={estado.erros?.sessoesPorMes}
          ajuda={porAluno ? "Só informativo: esta mesa é paga por aluno." : "Usado na previsão de custo."}
        />
        <Campo
          rotulo="Capacidade (jogadores)"
          name="capacidade"
          type="number"
          min={1}
          max={50}
          required
          defaultValue={v.capacidade}
          erros={estado.erros?.capacidade}
        />
      </div>
      <AreaTexto rotulo="Descrição (opcional)" name="descricao" defaultValue={v.descricao} erros={estado.erros?.descricao} />
      <Erro mensagem={estado.mensagem} />
      <div className="flex gap-2">
        <button type="submit" disabled={pendente} className="btn-primario">
          {pendente ? "Salvando..." : "Salvar"}
        </button>
        <Link href="/mesas" className="btn-secundario">
          Cancelar
        </Link>
      </div>
    </FormAcao>
  );
}
