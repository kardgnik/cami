export type TipoTaxa = "plataforma" | "metodoPagamento";

export const CONFIG_TAXA = {
  plataforma: {
    caminho: "/plataformas",
    singular: "plataforma",
    plural: "Plataformas",
    novo: "Nova plataforma",
    artigo: "a",
    descricao: "De onde vêm os jogadores. A taxa da plataforma é descontada de cada cobrança.",
  },
  metodoPagamento: {
    caminho: "/metodos-pagamento",
    singular: "método de pagamento",
    plural: "Métodos de pagamento",
    novo: "Novo método",
    artigo: "o",
    descricao: "Formas de pagamento aceitas. A taxa do método soma-se à da plataforma.",
  },
} as const;
