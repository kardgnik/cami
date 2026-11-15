import type { Periodicidade } from "./finance";

export const PERIODICIDADES: { valor: Periodicidade; rotulo: string; sufixo: string }[] = [
  { valor: "MENSAL", rotulo: "Mensal", sufixo: "/mês" },
  { valor: "TRIMESTRAL", rotulo: "Trimestral", sufixo: "/trimestre" },
  { valor: "SEMESTRAL", rotulo: "Semestral", sufixo: "/semestre" },
  { valor: "ANUAL", rotulo: "Anual", sufixo: "/ano" },
];

export function rotuloPeriodicidade(p: Periodicidade) {
  return PERIODICIDADES.find((x) => x.valor === p)?.rotulo ?? p;
}

export function sufixoPeriodicidade(p: Periodicidade) {
  return PERIODICIDADES.find((x) => x.valor === p)?.sufixo ?? "";
}

export type Status = "ATIVO" | "INADIMPLENTE" | "CANCELADO";

export const STATUS: { valor: Status; rotulo: string }[] = [
  { valor: "ATIVO", rotulo: "Ativo" },
  { valor: "INADIMPLENTE", rotulo: "Inadimplente" },
  { valor: "CANCELADO", rotulo: "Cancelado" },
];

export function rotuloStatus(s: Status) {
  return STATUS.find((x) => x.valor === s)?.rotulo ?? s;
}

export type TipoSessao = "NORMAL" | "REPOSICAO" | "EXTRA" | "DUPLA" | "ONESHOT";

/** Opções na ordem do formulário que os mestres já usam. */
export const TIPOS_SESSAO: { valor: TipoSessao; rotulo: string; ajuda: string }[] = [
  { valor: "NORMAL", rotulo: "Sessão normal", ajuda: "Sessão comum da mesa." },
  { valor: "REPOSICAO", rotulo: "Reposição", ajuda: "Repõe uma sessão que não aconteceu. Informe a data original." },
  { valor: "EXTRA", rotulo: "Sessão extra", ajuda: "Sessão a mais da mesa." },
  { valor: "ONESHOT", rotulo: "Oneshot paga", ajuda: "Aventura avulsa, sem mesa fixa. Informe o nome da oneshot." },
  { valor: "DUPLA", rotulo: "Sessão dupla", ajuda: "Vale por duas sessões (paga o dobro)." },
];

/** Tipos de lançamento gravados: os tipos de sessão mais a mensalidade (mesas pagas por aluno). */
export type TipoLancamento = TipoSessao | "MENSALIDADE";

export function rotuloTipoSessao(t: TipoLancamento) {
  if (t === "MENSALIDADE") return "Mensalidade";
  return TIPOS_SESSAO.find((x) => x.valor === t)?.rotulo ?? t;
}

/** Nome exibido no lugar da mesa: o nome da mesa ou "Oneshot: <nome>". */
export function nomeDaSessao(s: { mesa: { nome: string } | null; nomeOneshot: string | null }) {
  return s.mesa ? s.mesa.nome : `Oneshot: ${s.nomeOneshot ?? "sem nome"}`;
}

/** Data de um lançamento: dd/mm/aaaa, ou mm/aaaa quando é a mensalidade do mês. */
export function dataDoLancamento(s: { tipo: TipoLancamento; data: Date }) {
  const texto = s.data.toLocaleDateString("pt-BR", { timeZone: "UTC" });
  return s.tipo === "MENSALIDADE" ? texto.slice(3) : texto;
}

export type DiaSemana = "DOMINGO" | "SEGUNDA" | "TERCA" | "QUARTA" | "QUINTA" | "SEXTA" | "SABADO";

export const DIAS_SEMANA: { valor: DiaSemana; rotulo: string; curto: string }[] = [
  { valor: "SEGUNDA", rotulo: "Segunda-feira", curto: "Seg" },
  { valor: "TERCA", rotulo: "Terça-feira", curto: "Ter" },
  { valor: "QUARTA", rotulo: "Quarta-feira", curto: "Qua" },
  { valor: "QUINTA", rotulo: "Quinta-feira", curto: "Qui" },
  { valor: "SEXTA", rotulo: "Sexta-feira", curto: "Sex" },
  { valor: "SABADO", rotulo: "Sábado", curto: "Sáb" },
  { valor: "DOMINGO", rotulo: "Domingo", curto: "Dom" },
];

export function rotuloDia(d: DiaSemana | null | undefined, curto = false) {
  const dia = DIAS_SEMANA.find((x) => x.valor === d);
  return dia ? (curto ? dia.curto : dia.rotulo) : null;
}

export type PagamentoMestre = "POR_SESSAO" | "POR_ALUNO";

export const PAGAMENTOS_MESTRE: { valor: PagamentoMestre; rotulo: string; ajuda: string }[] = [
  { valor: "POR_SESSAO", rotulo: "Por sessão", ajuda: "O mestre recebe um valor a cada sessão registrada." },
  {
    valor: "POR_ALUNO",
    rotulo: "Por aluno, por mês",
    ajuda: "O mestre recebe um valor mensal por aluno da mesa. As sessões ficam registradas sem valor.",
  },
];
