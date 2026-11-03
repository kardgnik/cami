import { describe, expect, it } from "vitest";
import {
  assinaturaSchema,
  mesaSchema,
  mestreEditarSchema,
  planoSchema,
  taxaEntidadeSchema,
  trocarSenhaSchema,
  validar,
} from "./validations";

function fd(obj: Record<string, string | string[]>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(obj)) {
    if (Array.isArray(v)) v.forEach((x) => f.append(k, x));
    else f.set(k, v);
  }
  return f;
}

describe("validações", () => {
  it("converte taxas digitadas em pt-BR", () => {
    const r = validar(taxaEntidadeSchema, fd({ nome: " Hotmart ", taxaPercentualBp: "4,99", taxaFixaCentavos: "0,40" }));
    expect(r).toEqual({ ok: true, dados: { nome: "Hotmart", taxaPercentualBp: 499, taxaFixaCentavos: 40 } });
  });

  it("rejeita percentual acima de 100% e devolve o que foi digitado", () => {
    const r = validar(taxaEntidadeSchema, fd({ nome: "X", taxaPercentualBp: "150", taxaFixaCentavos: "0" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.estado.valores?.taxaPercentualBp).toBe("150");
  });

  it("plano exige valor positivo e limite de mesas", () => {
    expect(validar(planoSchema, fd({ nome: "B", valorCentavos: "0", periodicidade: "MENSAL", limiteMesas: "1" })).ok).toBe(false);
    const r = validar(planoSchema, fd({ nome: "B", valorCentavos: "100", periodicidade: "MENSAL", limiteMesas: "2" }));
    expect(r.ok && r.dados.limiteMesas).toBe(2);
  });

  it("assinatura lê mesas de checkboxes (mesaIds[]) sem duplicar", () => {
    const base = { planoId: "1", plataformaId: "2", metodoPagamentoId: "3", status: "ATIVO", dataInicio: "2026-11-03" };
    const r = validar(assinaturaSchema, fd({ ...base, "mesaIds[]": ["4", "5", "4"] }));
    expect(r.ok && r.dados.mesaIds).toEqual([4, 5]);
    const vazio = validar(assinaturaSchema, fd(base));
    expect(vazio.ok && vazio.dados.mesaIds).toEqual([]);
  });

  it("mesa: mestre e valor por sessão são opcionais", () => {
    const r = validar(
      mesaSchema,
      fd({ nome: "Mesa 1", tipoMesaId: "1", mestreId: "", valorSessaoCentavos: "", sessoesPorMes: "2", capacidade: "6" }),
    );
    expect(r.ok && r.dados).toMatchObject({ mestreId: null, valorSessaoCentavos: null, sessoesPorMes: 2, capacidade: 6 });
    const comValor = validar(
      mesaSchema,
      fd({ nome: "Mesa 2", tipoMesaId: "1", mestreId: "3", valorSessaoCentavos: "40,00", sessoesPorMes: "4", capacidade: "6" }),
    );
    expect(comValor.ok && comValor.dados).toMatchObject({ mestreId: 3, valorSessaoCentavos: 4_000 });
  });

  it("mestre: senha vazia na edição mantém a atual; curta é rejeitada", () => {
    const base = { nome: "M", email: "m@x.com" };
    const r = validar(mestreEditarSchema, fd({ ...base, senha: "" }));
    expect(r.ok && r.dados.senha).toBeNull();
    const curta = validar(mestreEditarSchema, fd({ ...base, senha: "123" }));
    expect(curta.ok).toBe(false);
    if (!curta.ok) expect(curta.estado.valores?.senha).toBeUndefined();
  });

  it("troca de senha exige confirmação igual", () => {
    const r = validar(trocarSenhaSchema, fd({ senhaAtual: "a", novaSenha: "12345678", confirmacao: "87654321" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.estado.erros?.confirmacao).toBeDefined();
  });
});
