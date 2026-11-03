import { Suspense } from "react";
import { sair } from "@/app/actions/auth";
import { LinksMestre, NavMestre } from "./nav";

export const metadata = { title: "Painel do mestre · Gestão de Mesas" };

export default function MestreLayout({ children }: LayoutProps<"/mestre">) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-base font-semibold text-slate-900">Painel do mestre</p>
            <p className="text-xs text-slate-500">Gestão de Mesas</p>
          </div>
          <div className="flex items-center gap-2">
            <Suspense fallback={<LinksMestre />}>
              <NavMestre />
            </Suspense>
            <form action={sair}>
              <button type="submit" className="btn-secundario">
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6 md:py-8">{children}</main>
    </div>
  );
}
