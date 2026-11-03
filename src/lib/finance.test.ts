import { describe, expect, it } from "vitest";
import { calcularLiquido, calcularTaxa, equivalenteMensal, liquidoMensal } from "./finance";

const semTaxa = { taxaPercentualBp: 0, taxaFixaCentavos: 0 };

describe("calcularTaxa", () => {
  it("aplica só percentual", () => {
    expect(calcularTaxa(10_000, { taxaPercentualBp: 1_000, taxaFixaCentavos: 0 })).toBe(1_000);
  });

  it("aplica só valor fixo", () => {
    expect(calcularTaxa(10_000, { taxaPercentualBp: 0, taxaFixaCentavos: 200 })).toBe(200);
  });

  it("aplica percentual + fixo", () => {
    expect(calcularTaxa(10_000, { taxaPercentualBp: 499, taxaFixaCentavos: 40 })).toBe(539);
  });

  it("arredonda o percentual ao centavo (half-up)", () => {
    // 4,99% de R$ 9,90 = 49,401 centavos -> 49
    expect(calcularTaxa(990, { taxaPercentualBp: 499, taxaFixaCentavos: 0 })).toBe(49);
    // 5% de R$ 0,10 = 0,5 centavo -> 1
    expect(calcularTaxa(10, { taxaPercentualBp: 500, taxaFixaCentavos: 0 })).toBe(1);
    // 4,99% de R$ 29,90 = 149,201 -> 149
    expect(calcularTaxa(2_990, { taxaPercentualBp: 499, taxaFixaCentavos: 0 })).toBe(149);
  });

  it("não cobra taxa de valor zero", () => {
    expect(calcularTaxa(0, { taxaPercentualBp: 499, taxaFixaCentavos: 40 })).toBe(0);
  });
});

describe("calcularLiquido", () => {
  it("desconta taxa da plataforma (exemplo do plano: 4,99% + R$ 0,40 sobre R$ 100)", () => {
    const r = calcularLiquido(10_000, { taxaPercentualBp: 499, taxaFixaCentavos: 40 }, semTaxa);
    expect(r).toEqual({
      bruto: 10_000,
      taxaPlataforma: 539,
      taxaMetodo: 0,
      totalTaxas: 539,
      liquido: 9_461,
    });
  });

  it("soma a taxa do método de pagamento à da plataforma", () => {
    const r = calcularLiquido(
      10_000,
      { taxaPercentualBp: 1_000, taxaFixaCentavos: 0 },
      { taxaPercentualBp: 299, taxaFixaCentavos: 50 },
    );
    expect(r.taxaPlataforma).toBe(1_000);
    expect(r.taxaMetodo).toBe(349);
    expect(r.liquido).toBe(10_000 - 1_349);
  });

  it("pode ficar negativo quando as taxas superam o valor", () => {
    const r = calcularLiquido(100, { taxaPercentualBp: 0, taxaFixaCentavos: 200 }, semTaxa);
    expect(r.liquido).toBe(-100);
  });
});

describe("equivalente mensal", () => {
  it("divide pelo número de meses do período", () => {
    expect(equivalenteMensal(120_000, "ANUAL")).toBe(10_000);
    expect(equivalenteMensal(30_000, "TRIMESTRAL")).toBe(10_000);
    expect(equivalenteMensal(10_000, "MENSAL")).toBe(10_000);
  });

  it("mantém bruto - taxas = líquido após arredondar", () => {
    const r = calcularLiquido(99_700, { taxaPercentualBp: 499, taxaFixaCentavos: 40 }, semTaxa);
    const m = liquidoMensal(r, "ANUAL");
    expect(m.bruto - m.totalTaxas).toBe(m.liquido);
  });
});

describe("custo com mestres", () => {
  it("usa o valor da mesa quando definido, senão o do tipo", async () => {
    const { valorSessaoDaMesa, custoMensalPrevistoDaMesa } = await import("./finance");
    const vip = { valorSessaoCentavos: 3_500 };
    expect(valorSessaoDaMesa({ valorSessaoCentavos: null }, vip)).toBe(3_500);
    expect(valorSessaoDaMesa({ valorSessaoCentavos: 4_000 }, vip)).toBe(4_000);
    expect(custoMensalPrevistoDaMesa({ valorSessaoCentavos: null, sessoesPorMes: 2 }, vip)).toBe(7_000);
  });
});
