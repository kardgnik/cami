import { describe, expect, it } from "vitest";
import { descreverTaxa, formatarMoeda, formatarPercentual, lerDecimal, paraInput } from "./format";

describe("lerDecimal", () => {
  it.each([
    ["100", 10_000],
    ["100,5", 10_050],
    ["4,99", 499],
    ["0,40", 40],
    ["1.234,56", 123_456],
    ["1234.56", 123_456],
    ["1.234", 123_400],
    ["R$ 10,00", 1_000],
    ["4,99%", 499],
    [" 7 ", 700],
  ])("lê %s", (texto, esperado) => {
    expect(lerDecimal(texto)).toBe(esperado);
  });

  it.each(["", "abc", "1,234", "-5", "1,2,3", "10,"])("rejeita %j", (texto) => {
    expect(lerDecimal(texto)).toBeNull();
  });
});

describe("formatação", () => {
  it("formata moeda e percentual em pt-BR", () => {
    expect(formatarMoeda(123_456).replace(/\s/g, " ")).toBe("R$ 1.234,56");
    expect(formatarPercentual(499)).toBe("4,99%");
  });

  it("gera texto para input sem separador de milhar", () => {
    expect(paraInput(123_456)).toBe("1234,56");
    expect(paraInput(40)).toBe("0,40");
  });

  it("descreve a taxa", () => {
    expect(descreverTaxa({ taxaPercentualBp: 499, taxaFixaCentavos: 40 }).replace(/\s/g, " ")).toBe(
      "4,99% + R$ 0,40",
    );
    expect(descreverTaxa({ taxaPercentualBp: 0, taxaFixaCentavos: 0 })).toBe("Sem taxa");
  });
});

describe("hojeISO", () => {
  it("usa o fuso de Brasília", async () => {
    const { hojeISO } = await import("./datas");
    // 02:00 UTC de 4/11 ainda é 23:00 de 3/11 em Brasília
    expect(hojeISO(new Date("2026-11-04T02:00:00Z"))).toBe("2026-11-03");
  });
});
