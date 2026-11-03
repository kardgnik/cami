import Link from "next/link";
import type { ReactNode } from "react";

export function Cabecalho({
  titulo,
  descricao,
  acoes,
  voltar,
}: {
  titulo: string;
  descricao?: ReactNode;
  acoes?: ReactNode;
  voltar?: { href: string; rotulo: string };
}) {
  return (
    <div className="mb-6">
      {voltar && (
        <Link href={voltar.href} className="mb-2 inline-block text-sm text-slate-500 hover:text-slate-800">
          ← {voltar.rotulo}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{titulo}</h1>
          {descricao && <p className="mt-1 text-sm text-slate-500">{descricao}</p>}
        </div>
        {acoes && <div className="flex gap-2">{acoes}</div>}
      </div>
    </div>
  );
}

const CORES = {
  verde: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  amarelo: "bg-amber-50 text-amber-800 ring-amber-600/20",
  cinza: "bg-slate-100 text-slate-600 ring-slate-500/20",
  vermelho: "bg-red-50 text-red-700 ring-red-600/20",
} as const;

export function Selo({ cor, children }: { cor: keyof typeof CORES; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${CORES[cor]}`}>
      {children}
    </span>
  );
}

export function SeloAtivo({ ativo }: { ativo: boolean }) {
  return ativo ? <Selo cor="verde">Ativo</Selo> : <Selo cor="cinza">Inativo</Selo>;
}

export function SeloStatus({ status }: { status: "ATIVO" | "INADIMPLENTE" | "CANCELADO" }) {
  if (status === "ATIVO") return <Selo cor="verde">Ativo</Selo>;
  if (status === "INADIMPLENTE") return <Selo cor="amarelo">Inadimplente</Selo>;
  return <Selo cor="cinza">Cancelado</Selo>;
}

export function Vazio({ children }: { children: ReactNode }) {
  return <div className="px-6 py-12 text-center text-sm text-slate-500">{children}</div>;
}
