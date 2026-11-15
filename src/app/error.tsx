"use client";

import Link from "next/link";

/** Tela mostrada quando uma página falha: em português e com a opção de tentar de novo. */
export default function Erro({ error, retry }: { error: unknown; retry: () => void }) {
  const codigo = error instanceof Error && "digest" in error ? String(error.digest) : null;
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="cartao max-w-md p-8 text-center">
        <h1 className="text-xl font-semibold text-slate-900">Algo deu errado</h1>
        <p className="mt-2 text-sm text-slate-500">
          Não foi possível carregar esta página. Seus dados não foram alterados. Se o banco de dados estiver desligado, ligue-o
          e tente de novo.
        </p>
        {codigo && <p className="mt-2 text-xs text-slate-400">Código do erro: {codigo}</p>}
        <div className="mt-6 flex justify-center gap-2">
          {/* retry busca os dados de novo no servidor */}
          <button type="button" onClick={() => retry()} className="btn-primario">
            Tentar de novo
          </button>
          <Link href="/" className="btn-secundario">
            Ir para o início
          </Link>
        </div>
      </div>
    </main>
  );
}
