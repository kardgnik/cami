import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata = { title: "Entrar · Gestão de Mesas" };

async function FormularioComDestino({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const { de, inativo } = await searchParams;
  return (
    <>
      {inativo !== undefined && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Seu acesso foi desativado. Fale com o gerente.
        </p>
      )}
      <LoginForm de={typeof de === "string" ? de : ""} />
    </>
  );
}

export default function LoginPage(props: PageProps<"/login">) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Gestão de Mesas</h1>
        <p className="mt-1 text-sm text-slate-500">Acesso do gerente e dos mestres.</p>
        <Suspense fallback={<LoginForm de="" />}>
          <FormularioComDestino searchParams={props.searchParams} />
        </Suspense>
      </div>
    </main>
  );
}
