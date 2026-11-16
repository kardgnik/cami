/**
 * Regras financeiras do sistema. Funções puras, sem acesso a banco,
 * usadas tanto no servidor quanto na prévia do formulário (client).
 *
 * Convenções:
 * - valores monetários em centavos (inteiros);
 * - percentuais em pontos-base (1% = 100, 4,99% = 499).
 */

export type Periodicidade = "MENSAL" | "TRIMESTRAL" | "SEMESTRAL" | "ANUAL";

export type Taxa = {
  taxaPercentualBp: number;
  taxaFixaCentavos: number;
};

export type ResultadoLiquido = {
  bruto: number;
  taxaPlataforma: number;
  taxaMetodo: number;
  totalTaxas: number;
  liquido: number;
};

export const MESES_POR_PERIODO: Record<Periodicidade, number> = {
  MENSAL: 1,
  TRIMESTRAL: 3,
  SEMESTRAL: 6,
  ANUAL: 12,
};

/** Taxa cobrada sobre uma cobrança: percentual (arredondado ao centavo, half-up) + valor fixo. */
export function calcularTaxa(valorCentavos: number, taxa: Taxa): number {
  if (valorCentavos <= 0) return 0;
  // valor * bp é inteiro exato; a divisão só gera ".5" exato quando é o caso de empate,
  // então Math.round (half-up para positivos) arredonda corretamente.
  const percentual = Math.round((valorCentavos * taxa.taxaPercentualBp) / 10_000);
  return percentual + taxa.taxaFixaCentavos;
}

/** Valor líquido de uma cobrança após as taxas da plataforma e do método de pagamento. */
export function calcularLiquido(
  valorCentavos: number,
  plataforma: Taxa,
  metodo: Taxa,
): ResultadoLiquido {
  const taxaPlataforma = calcularTaxa(valorCentavos, plataforma);
  const taxaMetodo = calcularTaxa(valorCentavos, metodo);
  const totalTaxas = taxaPlataforma + taxaMetodo;
  return {
    bruto: valorCentavos,
    taxaPlataforma,
    taxaMetodo,
    totalTaxas,
    liquido: valorCentavos - totalTaxas,
  };
}

/** Converte um valor por cobrança no equivalente mensal (ex.: anual / 12), em centavos. */
export function equivalenteMensal(valorCentavos: number, periodicidade: Periodicidade): number {
  return Math.round(valorCentavos / MESES_POR_PERIODO[periodicidade]);
}

/** Resultado por cobrança convertido para o equivalente mensal. */
export function liquidoMensal(r: ResultadoLiquido, periodicidade: Periodicidade): ResultadoLiquido {
  const m = (v: number) => equivalenteMensal(v, periodicidade);
  const bruto = m(r.bruto);
  const totalTaxas = m(r.totalTaxas);
  return {
    bruto,
    taxaPlataforma: m(r.taxaPlataforma),
    taxaMetodo: m(r.taxaMetodo),
    totalTaxas,
    // derivado para manter bruto - taxas = líquido mesmo após arredondar
    liquido: bruto - totalTaxas,
  };
}

export type PagamentoMestre = "POR_SESSAO" | "POR_ALUNO";

type ValoresDaMesa = { valorSessaoCentavos: number | null; valorAlunoCentavos: number | null };
type ValoresDoTipo = { pagamentoMestre: PagamentoMestre; valorSessaoCentavos: number; valorAlunoCentavos: number };

/**
 * Valor pago ao mestre por sessão: o da mesa, se definido, senão o do tipo da mesa.
 * Mesas pagas por aluno não pagam por sessão (o mestre recebe a mensalidade).
 */
export function valorSessaoDaMesa(mesa: Pick<ValoresDaMesa, "valorSessaoCentavos">, tipo: ValoresDoTipo): number {
  if (tipo.pagamentoMestre === "POR_ALUNO") return 0;
  return mesa.valorSessaoCentavos ?? tipo.valorSessaoCentavos;
}

/** Valor por aluno, por mês, nas mesas pagas por aluno: o da mesa, se definido, senão o do tipo. */
export function valorAlunoDaMesa(mesa: Pick<ValoresDaMesa, "valorAlunoCentavos">, tipo: ValoresDoTipo): number {
  return mesa.valorAlunoCentavos ?? tipo.valorAlunoCentavos;
}

/** Mensalidade devida ao mestre de uma mesa paga por aluno: alunos × valor por aluno. */
export function mensalidadeDaMesa(mesa: Pick<ValoresDaMesa, "valorAlunoCentavos">, tipo: ValoresDoTipo, alunos: number): number {
  return valorAlunoDaMesa(mesa, tipo) * alunos;
}

/**
 * Custo mensal previsto de uma mesa com o mestre: valor por sessão × sessões por
 * mês ou, nas mesas pagas por aluno, alunos × valor por aluno.
 */
export function custoMensalPrevistoDaMesa(
  mesa: ValoresDaMesa & { sessoesPorMes: number },
  tipo: ValoresDoTipo,
  alunos: number,
): number {
  if (tipo.pagamentoMestre === "POR_ALUNO") return mensalidadeDaMesa(mesa, tipo, alunos);
  return valorSessaoDaMesa(mesa, tipo) * mesa.sessoesPorMes;
}

/** Vagas livres de uma mesa. Com grupo fechado não há vagas, qualquer que seja a ocupação. */
export function vagasDaMesa(capacidade: number, ocupacao: number, fechada: boolean): number {
  return fechada ? 0 : Math.max(0, capacidade - ocupacao);
}

export type TipoSessao = "NORMAL" | "REPOSICAO" | "EXTRA" | "DUPLA" | "ONESHOT";

/**
 * Valor pago ao mestre por uma sessão: normal, reposição e extra pagam o valor da
 * mesa; dupla paga o dobro; oneshot paga o valor configurado (não tem mesa).
 */
export function valorDaSessao(tipo: TipoSessao, valorMesaCentavos: number | null, valorOneshotCentavos: number): number {
  if (tipo === "ONESHOT") return valorOneshotCentavos;
  if (valorMesaCentavos === null) throw new Error("Sessão que não é oneshot precisa de mesa.");
  return tipo === "DUPLA" ? valorMesaCentavos * 2 : valorMesaCentavos;
}

export type Promocao = { valorPromocionalCentavos: number | null; promocaoAte: Date | null };

/** A promoção vale no dia `hojeISO` ("AAAA-MM-DD")? Vale até `promocaoAte`, inclusive. */
export function promocaoVigente(p: Promocao, hojeISO: string): boolean {
  if (p.valorPromocionalCentavos === null || !p.promocaoAte) return false;
  return hojeISO <= p.promocaoAte.toISOString().slice(0, 10);
}

/**
 * Valor cobrado hoje: o promocional enquanto a promoção vale; depois, o do plano.
 * Por ser calculado na hora, a assinatura "sobe" sozinha quando a promoção acaba.
 */
export function valorVigente(valorPlanoCentavos: number, p: Promocao, hojeISO: string): number {
  return promocaoVigente(p, hojeISO) ? p.valorPromocionalCentavos! : valorPlanoCentavos;
}
