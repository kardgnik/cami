import Link from "next/link";

export default function NaoEncontrado() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="cartao max-w-md p-8 text-center">
        <h1 className="text-xl font-semibold text-slate-900">Página não encontrada</h1>
        <p className="mt-2 text-sm text-slate-500">O endereço não existe ou o cadastro foi excluído.</p>
        <Link href="/" className="btn-primario mt-6">
          Voltar ao início
        </Link>
      </div>
    </main>
  );
}
