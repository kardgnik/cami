"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { AreaTexto, Campo, Erro, Selecao } from "@/components/form";
import { formatarMoeda, paraInput } from "@/lib/format";
import type { EstadoForm } from "@/lib/validations";

type Valores = {
  nome: string;
  descricao: string;
  tipoMesaId: string;
  mestreId: string;
  valorSessaoCentavos: string;
  sessoesPorMes: string;
  capacidade: string;
};

export type OpcaoTipo = { id: number; nome: string; valorSessaoCentavos: number };
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

  return (
    <form action={enviar} className="cartao max-w-2xl space-y-5 p-6">
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
              {t.nome} · {formatarMoeda(t.valorSessaoCentavos)}/sessão
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
      <div className="grid gap-4 sm:grid-cols-3">
        <Campo
          rotulo="Valor por sessão (opcional)"
          name="valorSessaoCentavos"
          inputMode="decimal"
          prefixo="R$"
          placeholder={tipo ? paraInput(tipo.valorSessaoCentavos) : "0,00"}
          defaultValue={v.valorSessaoCentavos}
          erros={estado.erros?.valorSessaoCentavos}
          ajuda={tipo ? `Vazio = valor do tipo (${formatarMoeda(tipo.valorSessaoCentavos)}).` : "Vazio = valor do tipo."}
        />
        <Campo
          rotulo="Sessões por mês"
          name="sessoesPorMes"
          type="number"
          min={0}
          max={31}
          required
          defaultValue={v.sessoesPorMes}
          erros={estado.erros?.sessoesPorMes}
          ajuda="Usado na previsão de custo."
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
    </form>
  );
}
