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
