"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/mestre", rotulo: "Início" },
  { href: "/mestre/senha", rotulo: "Trocar senha" },
] as const;

export function NavMestre() {
  return <LinksMestre caminho={usePathname()} />;
}

/** Sem `caminho` (fallback do Suspense), renderiza os links sem destaque. */
export function LinksMestre({ caminho }: { caminho?: string }) {
  return (
    <nav className="flex gap-1">
      {LINKS.map((l) => {
        const ativo = caminho === l.href;
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
