import Link from "next/link";
import { mesAtual, rotuloMes, somarMeses } from "@/lib/datas";

/**
 * Navegação mês anterior / próximo via ?mes=AAAA-MM, preservando os demais
 * parâmetros da URL. Use `mes` já validado (lerMes(...) ?? mesAtual()).
 */
export function SeletorMes({
  caminho,
  mes,
  params = {},
}: {
  caminho: string;
  mes: string;
  params?: Record<string, string | undefined>;
}) {
  const href = (m: string) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v && k !== "mes") q.set(k, v);
    q.set("mes", m);
    return `${caminho}?${q.toString()}`;
  };
  const atual = mesAtual();
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 text-sm">
      <Link href={href(somarMeses(mes, -1))} className="rounded-md px-2 py-1 text-slate-600 hover:bg-slate-100" aria-label="Mês anterior">
        ←
      </Link>
      <span className="min-w-36 px-2 text-center font-medium text-slate-800 first-letter:uppercase">{rotuloMes(mes)}</span>
      <Link href={href(somarMeses(mes, 1))} className="rounded-md px-2 py-1 text-slate-600 hover:bg-slate-100" aria-label="Próximo mês">
        →
      </Link>
      {mes !== atual && (
        <Link href={href(atual)} className="rounded-md px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50">
          Hoje
        </Link>
      )}
    </div>
  );
}
