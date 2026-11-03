import { describe, expect, it } from "vitest";
import { intervaloDoMes, lerMes, mesAtual, rotuloMes, somarMeses } from "./datas";

describe("datas", () => {
  it("mês atual usa o fuso de Brasília", () => {
    expect(mesAtual(new Date("2026-12-01T02:00:00Z"))).toBe("2026-11");
  });
  it("intervalo do mês", () => {
    const { inicio, fim } = intervaloDoMes("2026-12");
    expect(inicio.toISOString()).toBe("2026-12-01T00:00:00.000Z");
    expect(fim.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });
  it("soma meses atravessando o ano", () => {
    expect(somarMeses("2026-12", 1)).toBe("2027-01");
    expect(somarMeses("2026-01", -1)).toBe("2025-12");
  });
  it("valida e rotula", () => {
    expect(lerMes("2026-13")).toBeNull();
    expect(lerMes("2026-02")).toBe("2026-02");
    expect(rotuloMes("2026-11")).toBe("novembro de 2026");
  });
});
