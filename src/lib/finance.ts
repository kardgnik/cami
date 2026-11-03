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

/** Valor pago ao mestre por sessão: o da mesa, se definido, senão o do tipo da mesa. */
export function valorSessaoDaMesa(
  mesa: { valorSessaoCentavos: number | null },
  tipo: { valorSessaoCentavos: number },
): number {
  return mesa.valorSessaoCentavos ?? tipo.valorSessaoCentavos;
}

/** Custo mensal previsto de uma mesa com o mestre: valor por sessão × sessões por mês. */
export function custoMensalPrevistoDaMesa(
  mesa: { valorSessaoCentavos: number | null; sessoesPorMes: number },
  tipo: { valorSessaoCentavos: number },
): number {
  return valorSessaoDaMesa(mesa, tipo) * mesa.sessoesPorMes;
}
