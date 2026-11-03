"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", rotulo: "Visão geral" },
  { href: "/assinantes", rotulo: "Assinantes" },
  { href: "/planos", rotulo: "Planos" },
  { href: "/plataformas", rotulo: "Plataformas" },
  { href: "/metodos-pagamento", rotulo: "Métodos de pagamento" },
] as const;

export function NavLinks() {
  return <ListaLinks caminho={usePathname()} />;
}

/** Sem `caminho` (fallback do Suspense), renderiza os links sem destaque. */
export function ListaLinks({ caminho }: { caminho?: string }) {
  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col">
      {LINKS.map((l) => {
        const ativo = !!caminho && (l.href === "/" ? caminho === "/" : caminho.startsWith(l.href));
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={ativo ? "page" : undefined}
            className={`rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              ativo ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            {l.rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
