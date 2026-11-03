import { z } from "zod";
import { lerDecimal } from "./format";

const maiuscula = (s: string) => `${s[0].toUpperCase()}${s.slice(1)}`;

/** Campo decimal digitado pelo usuário -> inteiro em centésimos. Vazio vale 0. */
function decimal(rotulo: string, { min = 0, max }: { min?: number; max?: number } = {}) {
  return z
    .string({ error: `Informe ${rotulo}.` })
    .trim()
    .transform((texto, ctx) => {
      const valor = texto === "" ? 0 : lerDecimal(texto);
      if (valor === null) {
        ctx.addIssue({ code: "custom", message: `${maiuscula(rotulo)} inválido.` });
        return z.NEVER;
      }
      if (valor < min || (max !== undefined && valor > max)) {
        ctx.addIssue({ code: "custom", message: `${maiuscula(rotulo)} fora do limite.` });
        return z.NEVER;
      }
      return valor;
    });
}

/** Como `decimal`, mas vazio vira null (campo opcional). */
function decimalOpcional(rotulo: string) {
  return z
    .string()
    .trim()
    .optional()
    .transform((texto, ctx) => {
      if (!texto) return null;
      const valor = lerDecimal(texto);
      if (valor === null) {
        ctx.addIssue({ code: "custom", message: `${maiuscula(rotulo)} inválido.` });
        return z.NEVER;
      }
      return valor;
    });
}

function inteiro(rotulo: string, min: number, max: number) {
  return z.coerce
    .number({ error: `Informe ${rotulo}.` })
    .int(`${maiuscula(rotulo)} deve ser um número inteiro.`)
    .min(min, `${maiuscula(rotulo)}: mínimo ${min}.`)
    .max(max, `${maiuscula(rotulo)}: máximo ${max}.`);
}

const nome = z.string().trim().min(1, "Informe o nome.").max(120, "Nome muito longo.");

/** Nome de usuário para login: minúsculas, números, ponto, hífen e sublinhado. */
export const REGRA_USUARIO = "De 3 a 40 caracteres: letras minúsculas, números, ponto, hífen ou sublinhado (sem espaços nem acentos).";
const usuario = z
  .string({ error: "Informe o nome de usuário." })
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9._-]{3,40}$/, REGRA_USUARIO);

const emailOpcional = z
  .string()
  .trim()
  .toLowerCase()
  .optional()
  .transform((v) => (v ? v : null))
  .pipe(z.email("E-mail inválido.").nullable());

const telefoneObrigatorio = z
  .string({ error: "Informe o telefone." })
  .trim()
  .min(1, "Informe o telefone.")
  .max(40, "Telefone muito longo.")
  .refine((v) => v.replace(/\D/g, "").length >= 8, "Telefone inválido: informe ao menos 8 dígitos.");

const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, "Texto muito longo.")
    .optional()
    .transform((v) => (v ? v : null));

const id = (rotulo: string) =>
  z.coerce.number({ error: `Selecione ${rotulo}.` }).int().positive(`Selecione ${rotulo}.`);

/** Select opcional: "" vira null. */
const idOpcional = z
  .string()
  .optional()
  .transform((v, ctx) => {
    if (!v) return null;
    const n = Number(v);
    if (!Number.isSafeInteger(n) || n <= 0) {
      ctx.addIssue({ code: "custom", message: "Seleção inválida." });
      return z.NEVER;
    }
    return n;
  });

const dataISO = z.iso.date("Data inválida.").transform((d) => new Date(`${d}T00:00:00Z`));

const senhaNova = z.string().min(8, "A senha precisa ter ao menos 8 caracteres.").max(200, "Senha muito longa.");

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
  limiteMesas: inteiro("o número de mesas", 1, 50),
});

export const jogadorSchema = z.object({
  nome,
  telefone: telefoneObrigatorio,
  email: emailOpcional,
  observacoes: textoOpcional(1000),
});

/** `mesaIds` vem de checkboxes com name="mesaIds[]". */
export const assinaturaSchema = z.object({
  planoId: id("o plano"),
  plataformaId: id("a plataforma"),
  metodoPagamentoId: id("o método de pagamento"),
  status: z.enum(["ATIVO", "INADIMPLENTE", "CANCELADO"], { error: "Selecione o status." }),
  dataInicio: dataISO,
  observacoes: textoOpcional(1000),
  mesaIds: z
    .array(z.coerce.number().int().positive())
    .default([])
    .transform((ids) => [...new Set(ids)]),
});

export const tipoMesaSchema = z.object({
  nome,
  valorSessaoCentavos: decimal("o valor por sessão"),
});

export const mesaSchema = z.object({
  nome,
  descricao: textoOpcional(500),
  tipoMesaId: id("o tipo de mesa"),
  mestreId: idOpcional,
  valorSessaoCentavos: decimalOpcional("o valor por sessão"),
  sessoesPorMes: inteiro("sessões por mês", 0, 31),
  capacidade: inteiro("a capacidade", 1, 50),
});

const mestreBase = {
  nome,
  usuario,
  email: emailOpcional,
  telefone: textoOpcional(40),
  chavePix: textoOpcional(140),
};

/** Ao criar, a senha inicial é obrigatória. */
export const mestreCriarSchema = z.object({ ...mestreBase, senha: senhaNova });

/** Ao editar, senha vazia mantém a atual. */
export const mestreEditarSchema = z.object({
  ...mestreBase,
  senha: z
    .string()
    .optional()
    .transform((v) => (v ? v : null))
    .pipe(senhaNova.nullable()),
});

const camposSessao = {
  tipo: z.enum(["NORMAL", "REPOSICAO", "EXTRA", "DUPLA", "ONESHOT"], { error: "Selecione o tipo de sessão." }),
  /** Mesa: obrigatória, exceto em oneshot (ignorada nesse caso). */
  mesaId: idOpcional,
  nomeOneshot: textoOpcional(120),
  data: dataISO,
  /** Reposição: data da sessão original. Opcional no campo, exigida pela regra abaixo. */
  dataReferencia: z
    .string()
    .optional()
    .transform((v) => (v ? v : null))
    .pipe(dataISO.nullable()),
  observacoes: textoOpcional(500),
};

type DadosSessao = {
  tipo: string;
  mesaId: number | null;
  nomeOneshot: string | null;
  data: Date;
  dataReferencia: Date | null;
};

/** Regras que dependem do tipo: mesa x oneshot e a data de referência da reposição. */
function regrasDaSessao<T extends DadosSessao>(d: T, ctx: z.RefinementCtx): T {
  if (d.tipo === "ONESHOT") {
    if (!d.nomeOneshot) ctx.addIssue({ code: "custom", path: ["nomeOneshot"], message: "Informe o nome da oneshot." });
    d = { ...d, mesaId: null };
  } else {
    if (!d.mesaId) ctx.addIssue({ code: "custom", path: ["mesaId"], message: "Selecione a mesa." });
    d = { ...d, nomeOneshot: null };
  }
  if (d.tipo === "REPOSICAO") {
    if (!d.dataReferencia) {
      ctx.addIssue({ code: "custom", path: ["dataReferencia"], message: "Informe a data da sessão que está sendo reposta." });
    } else if (d.dataReferencia.getTime() === d.data.getTime()) {
      ctx.addIssue({ code: "custom", path: ["dataReferencia"], message: "A data reposta deve ser diferente da data da reposição." });
    }
  } else {
    d = { ...d, dataReferencia: null };
  }
  return d;
}

/** Sessão registrada pelo mestre (o mestre vem da sessão de login). */
export const sessaoSchema = z.object(camposSessao).transform(regrasDaSessao);

/** Sessão registrada pelo gerente em nome de um mestre. */
export const sessaoAdminSchema = z
  .object({ ...camposSessao, mestreId: id("o mestre") })
  .transform(regrasDaSessao);

export const configuracaoSchema = z.object({
  valorOneshotCentavos: decimal("o valor da oneshot"),
});

export const trocarSenhaSchema = z
  .object({
    senhaAtual: z.string().min(1, "Informe a senha atual."),
    novaSenha: senhaNova,
    confirmacao: z.string(),
  })
  .refine((d) => d.novaSenha === d.confirmacao, {
    path: ["confirmacao"],
    message: "As senhas não conferem.",
  });

export const loginSchema = z.object({
  usuario: z.string().trim().toLowerCase().min(1, "Informe o usuário."),
  senha: z.string().min(1, "Informe a senha."),
});

/** Estado devolvido pelas server actions de formulário. */
export type EstadoForm = {
  erros?: Record<string, string[] | undefined>;
  mensagem?: string;
  /** Mensagem de sucesso (para formulários que não redirecionam). */
  sucesso?: string;
  valores?: Record<string, string | string[]>;
};

/**
 * Lê um FormData como objeto. Campos com nome terminado em "[]" (checkboxes,
 * selects múltiplos) viram arrays com o nome sem o sufixo; os demais, strings.
 */
export function lerFormulario(formData: FormData): Record<string, string | string[]> {
  const obj: Record<string, string | string[]> = {};
  for (const [chave, valor] of formData.entries()) {
    if (chave.startsWith("$") || typeof valor !== "string") continue;
    if (chave.endsWith("[]")) {
      const k = chave.slice(0, -2);
      obj[k] = [...((obj[k] as string[] | undefined) ?? []), valor];
    } else {
      obj[chave] = valor;
    }
  }
  return obj;
}

/** Valida um FormData e devolve os dados ou um EstadoForm com os erros e o que foi digitado. */
export function validar<T extends z.ZodType>(
  schema: T,
  formData: FormData,
): { ok: true; dados: z.output<T> } | { ok: false; estado: EstadoForm } {
  const bruto = lerFormulario(formData);
  const r = schema.safeParse(bruto);
  if (r.success) return { ok: true, dados: r.data };
  // não devolve senhas digitadas para o navegador
  const valores = Object.fromEntries(Object.entries(bruto).filter(([k]) => !/senha|confirmacao/i.test(k)));
  return {
    ok: false,
    estado: { erros: z.flattenError(r.error).fieldErrors as EstadoForm["erros"], valores },
  };
}

/** Converte erro de unicidade (P2002) em mensagem amigável no campo indicado. */
export function erroDeUnicidade(
  e: unknown,
  valores: Record<string, string | string[]>,
  campo = "nome",
  mensagem = "Já existe um cadastro com este nome.",
): EstadoForm | null {
  if (typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "P2002") {
    return { erros: { [campo]: [mensagem] }, valores };
  }
  return null;
}
