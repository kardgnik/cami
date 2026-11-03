/** Formatação e leitura de valores no padrão brasileiro (pt-BR / BRL). */

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const numero2 = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 12345 -> "R$ 123,45" */
export function formatarMoeda(centavos: number): string {
  return brl.format(centavos / 100);
}

/** 499 -> "4,99%" */
export function formatarPercentual(bp: number): string {
  return `${numero2.format(bp / 100)}%`;
}

/** Valor inteiro com 2 casas implícitas -> texto para inputs. 499 -> "4,99" */
export function paraInput(valor: number): string {
  return numero2.format(valor / 100).replace(/\./g, "");
}

/** Descrição curta de uma taxa: "4,99% + R$ 0,40", "Sem taxa", etc. */
export function descreverTaxa(taxa: { taxaPercentualBp: number; taxaFixaCentavos: number }): string {
  const partes: string[] = [];
  if (taxa.taxaPercentualBp > 0) partes.push(formatarPercentual(taxa.taxaPercentualBp));
  if (taxa.taxaFixaCentavos > 0) partes.push(formatarMoeda(taxa.taxaFixaCentavos));
  return partes.length ? partes.join(" + ") : "Sem taxa";
}

/**
 * Lê um número digitado com até 2 casas decimais e devolve o inteiro em centésimos
 * (centavos para dinheiro, pontos-base para percentual), sem usar ponto flutuante.
 *
 * Aceita "100", "100,5", "1.234,56", "1234.56", "R$ 10,00", "4,99%".
 * Devolve null se o texto não for um número válido.
 */
export function lerDecimal(texto: string): number | null {
  let s = texto.replace(/R\$|%|\s/g, "");
  if (s === "") return null;

  const temVirgula = s.includes(",");
  const pontos = (s.match(/\./g) ?? []).length;

  if (temVirgula) {
    // vírgula é o separador decimal; pontos são separadores de milhar
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (pontos === 1 && /\.\d{1,2}$/.test(s)) {
    // "1234.56" -> ponto decimal
  } else {
    // "1.234" ou "1.234.567" -> pontos de milhar
    s = s.replace(/\./g, "");
  }

  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(s);
  if (!m) return null;
  const inteiro = Number(m[1]);
  const frac = Number((m[2] ?? "").padEnd(2, "0"));
  const resultado = inteiro * 100 + frac;
  return Number.isSafeInteger(resultado) ? resultado : null;
}

/** Date -> "03/11/2026" (datas sem horário são tratadas em UTC). */
export function formatarData(data: Date): string {
  return data.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

/** Date -> "2026-11-03" para <input type="date">. */
export function paraInputData(data: Date): string {
  return data.toISOString().slice(0, 10);
}

/** Data de hoje (fuso de Brasília) no formato "AAAA-MM-DD". */
export function hojeISO(agora: Date = new Date()): string {
  // en-CA formata como AAAA-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(agora);
}
