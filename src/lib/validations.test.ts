import { describe, expect, it } from "vitest";
import { assinanteSchema, planoSchema, taxaEntidadeSchema, validar } from "./validations";

function fd(obj: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(obj)) f.set(k, v);
  return f;
}

describe("validações", () => {
  it("converte taxas digitadas em pt-BR", () => {
    const r = validar(taxaEntidadeSchema, fd({ nome: " Hotmart ", taxaPercentualBp: "4,99", taxaFixaCentavos: "0,40" }));
    expect(r).toEqual({ ok: true, dados: { nome: "Hotmart", taxaPercentualBp: 499, taxaFixaCentavos: 40 } });
  });

  it("campos de taxa vazios valem zero", () => {
    const r = validar(taxaEntidadeSchema, fd({ nome: "Pix", taxaPercentualBp: "", taxaFixaCentavos: "" }));
    expect(r.ok && r.dados).toEqual({ nome: "Pix", taxaPercentualBp: 0, taxaFixaCentavos: 0 });
  });

  it("rejeita percentual acima de 100% e devolve o que foi digitado", () => {
    const r = validar(taxaEntidadeSchema, fd({ nome: "X", taxaPercentualBp: "150", taxaFixaCentavos: "0" }));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.estado.erros?.taxaPercentualBp).toBeDefined();
      expect(r.estado.valores?.taxaPercentualBp).toBe("150");
    }
  });

  it("exige valor positivo no plano", () => {
    const r = validar(planoSchema, fd({ nome: "Básico", valorCentavos: "0", periodicidade: "MENSAL" }));
    expect(r.ok).toBe(false);
  });

  it("valida assinante", () => {
    const r = validar(
      assinanteSchema,
      fd({
        nome: "Ana",
        email: " Ana@Email.com ",
        telefone: "",
        status: "ATIVO",
        dataInicio: "2026-11-03",
        observacoes: "",
        planoId: "1",
        plataformaId: "2",
        metodoPagamentoId: "3",
      }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.dados.email).toBe("ana@email.com");
      expect(r.dados.telefone).toBeNull();
      expect(r.dados.dataInicio.toISOString()).toBe("2026-11-03T00:00:00.000Z");
      expect(r.dados.planoId).toBe(1);
    }
  });

  it("exige plano/plataforma/método selecionados", () => {
    const r = validar(
      assinanteSchema,
      fd({ nome: "Ana", email: "a@b.com", status: "ATIVO", dataInicio: "2026-11-03", planoId: "", plataformaId: "", metodoPagamentoId: "" }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.estado.erros ?? {})).toEqual(
      expect.arrayContaining(["planoId", "plataformaId", "metodoPagamentoId"]),
    );
  });
});
