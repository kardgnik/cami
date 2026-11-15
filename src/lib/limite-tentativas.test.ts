import { describe, expect, it } from "vitest";
import { LimiteTentativas } from "./limite-tentativas";

describe("limite de tentativas", () => {
  it("bloqueia depois do máximo de falhas e libera quando a janela passa", () => {
    let agora = 1_000_000;
    const l = new LimiteTentativas(3, 60_000, () => agora);
    expect(l.bloqueadoPor("admin")).toBe(0);
    l.registrarFalha("admin");
    l.registrarFalha("admin");
    expect(l.bloqueadoPor("admin")).toBe(0);
    agora += 10_000;
    l.registrarFalha("admin");
    expect(l.bloqueadoPor("admin")).toBe(50); // a 1ª falha sai da janela em 50 s
    expect(l.bloqueadoPor("outro")).toBe(0);
    agora += 50_000;
    expect(l.bloqueadoPor("admin")).toBe(0);
  });

  it("login certo zera as falhas", () => {
    const l = new LimiteTentativas(2, 60_000, () => 0);
    l.registrarFalha("a");
    l.registrarFalha("a");
    expect(l.bloqueadoPor("a")).toBeGreaterThan(0);
    l.limpar("a");
    expect(l.bloqueadoPor("a")).toBe(0);
  });
});
