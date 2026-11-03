import { z } from "zod";
import { lerDecimal } from "./format";

/** Campo decimal digitado pelo usuário -> inteiro em centésimos. */
function decimal(rotulo: string, { min = 0, max }: { min?: number; max?: number } = {}) {
  return z
    .string({ error: `Informe ${rotulo}.` })
    .trim()
    .transform((texto, ctx) => {
      const valor = texto === "" ? 0 : lerDecimal(texto);
      if (valor === null) {
        ctx.addIssue({ code: "custom", message: `${rotulo[0].toUpperCase()}${rotulo.slice(1)} inválido.` });
        return z.NEVER;
      }
      if (valor < min || (max !== undefined && valor > max)) {
        ctx.addIssue({ code: "custom", message: `${rotulo[0].toUpperCase()}${rotulo.slice(1)} fora do limite.` });
        return z.NEVER;
      }
      return valor;
    });
}

const nome = z.string().trim().min(1, "Informe o nome.").max(120, "Nome muito longo.");

const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, "Texto muito longo.")
    .optional()
    .transform((v) => (v ? v : null));

const id = (rotulo: string) =>
  z.coerce.number({ error: `Selecione ${rotulo}.` }).int().positive(`Selecione ${rotulo}.`);

/** Plataforma e método de pagamento têm o mesmo formato: nome + taxa percentual + taxa fixa. */
export const taxaEntidadeSchema = z.object({
  nome,
  taxaPercentualBp: decimal("o percentual", { max: 100_00 }),
  taxaFixaCentavos: decimal("o valor fixo"),
});

export const planoSchema = z.object({
  nome,
  descricao: textoOpcional(500),
  valorCentavos: decimal("o valor", { min: 1 }),
  periodicidade: z.enum(["MENSAL", "TRIMESTRAL", "SEMESTRAL", "ANUAL"], {
    error: "Selecione a periodicidade.",
  }),
});

export const assinanteSchema = z.object({
  nome,
  email: z.string().trim().toLowerCase().pipe(z.email("E-mail inválido.")),
  telefone: textoOpcional(40),
  status: z.enum(["ATIVO", "INADIMPLENTE", "CANCELADO"], { error: "Selecione o status." }),
  dataInicio: z.iso.date("Data inválida.").transform((d) => new Date(`${d}T00:00:00Z`)),
  observacoes: textoOpcional(1000),
  planoId: id("o plano"),
  plataformaId: id("a plataforma"),
  metodoPagamentoId: id("o método de pagamento"),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("E-mail inválido.")),
  senha: z.string().min(1, "Informe a senha."),
});

/** Estado devolvido pelas server actions de formulário. */
export type EstadoForm = {
  erros?: Record<string, string[] | undefined>;
  mensagem?: string;
  valores?: Record<string, string>;
};

/** Valida um FormData e devolve os dados ou um EstadoForm com os erros e o que foi digitado. */
export function validar<T extends z.ZodType>(
  schema: T,
  formData: FormData,
): { ok: true; dados: z.output<T> } | { ok: false; estado: EstadoForm } {
  const bruto = Object.fromEntries(
    [...formData.entries()].filter(([k, v]) => !k.startsWith("$") && typeof v === "string"),
  ) as Record<string, string>;
  const r = schema.safeParse(bruto);
  if (r.success) return { ok: true, dados: r.data };
  return {
    ok: false,
    estado: { erros: z.flattenError(r.error).fieldErrors as EstadoForm["erros"], valores: bruto },
  };
}

/** Converte erro de nome duplicado (P2002) em mensagem amigável. */
export function erroDeUnicidade(e: unknown, valores: Record<string, string>): EstadoForm | null {
  if (typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "P2002") {
    return { erros: { nome: ["Já existe um cadastro com este nome."] }, valores };
  }
  return null;
}
