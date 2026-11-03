import "server-only";
import { calcularLiquido, liquidoMensal, type Periodicidade, type ResultadoLiquido, type Taxa } from "./finance";

type ComRelacoes = {
  plano: { valorCentavos: number; periodicidade: Periodicidade };
  plataforma: Taxa;
  metodoPagamento: Taxa;
};

/** Valores por cobrança e equivalente mensal de um assinante, com as taxas atuais. */
export function financeiroDoAssinante(a: ComRelacoes): { porCobranca: ResultadoLiquido; mensal: ResultadoLiquido } {
  const porCobranca = calcularLiquido(a.plano.valorCentavos, a.plataforma, a.metodoPagamento);
  return { porCobranca, mensal: liquidoMensal(porCobranca, a.plano.periodicidade) };
}

export function somar(rs: ResultadoLiquido[]): ResultadoLiquido {
  return rs.reduce(
    (t, r) => ({
      bruto: t.bruto + r.bruto,
      taxaPlataforma: t.taxaPlataforma + r.taxaPlataforma,
      taxaMetodo: t.taxaMetodo + r.taxaMetodo,
      totalTaxas: t.totalTaxas + r.totalTaxas,
      liquido: t.liquido + r.liquido,
    }),
    { bruto: 0, taxaPlataforma: 0, taxaMetodo: 0, totalTaxas: 0, liquido: 0 },
  );
}
