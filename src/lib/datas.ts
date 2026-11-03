/** Datas no fuso de Brasília. Datas sem horário (@db.Date) são guardadas como meia-noite UTC. */

const FUSO = "America/Sao_Paulo";

/** Data de hoje (fuso de Brasília) no formato "AAAA-MM-DD". */
export function hojeISO(agora: Date = new Date()): string {
  // en-CA formata como AAAA-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(agora);
}

/** Mês atual (fuso de Brasília) no formato "AAAA-MM". */
export function mesAtual(agora: Date = new Date()): string {
  return hojeISO(agora).slice(0, 7);
}

/** Valida "AAAA-MM"; devolve o próprio texto ou null. */
export function lerMes(texto: string | undefined | null): string | null {
  if (!texto || !/^\d{4}-(0[1-9]|1[0-2])$/.test(texto)) return null;
  return texto;
}

/** Intervalo [inicio, fim) do mês, para filtrar colunas de data. */
export function intervaloDoMes(mes: string): { inicio: Date; fim: Date } {
  const [ano, m] = mes.split("-").map(Number);
  return { inicio: new Date(Date.UTC(ano, m - 1, 1)), fim: new Date(Date.UTC(ano, m, 1)) };
}

/** Desloca um mês "AAAA-MM" em `delta` meses. */
export function somarMeses(mes: string, delta: number): string {
  const [ano, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(ano, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

/** "2026-11" -> "novembro de 2026" */
export function rotuloMes(mes: string): string {
  const { inicio } = intervaloDoMes(mes);
  return inicio.toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
}

/** "AAAA-MM-DD" -> Date (meia-noite UTC), como gravado em colunas @db.Date. */
export function dataDoISO(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}
