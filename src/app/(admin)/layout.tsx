import { sair } from "@/app/actions/auth";
import { Suspense } from "react";
import { ListaLinks, NavLinks } from "./nav-links";

export default function AdminLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="border-b border-slate-200 bg-white md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 md:border-r md:border-b-0">
        <div className="flex h-full flex-col gap-4 p-4">
          <div className="px-2 pt-1">
            <p className="text-base font-semibold text-slate-900">Assinaturas</p>
            <p className="text-xs text-slate-500">Painel do gerente</p>
          </div>
          <Suspense fallback={<ListaLinks />}>
            <NavLinks />
          </Suspense>
          <form action={sair} className="md:mt-auto">
            <button type="submit" className="btn-secundario w-full">
              Sair
            </button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
