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

export function rotuloTipoSessao(t: TipoSessao) {
  return TIPOS_SESSAO.find((x) => x.valor === t)?.rotulo ?? t;
}

/** Nome exibido no lugar da mesa: o nome da mesa ou "Oneshot: <nome>". */
export function nomeDaSessao(s: { mesa: { nome: string } | null; nomeOneshot: string | null }) {
  return s.mesa ? s.mesa.nome : `Oneshot: ${s.nomeOneshot ?? "sem nome"}`;
}
