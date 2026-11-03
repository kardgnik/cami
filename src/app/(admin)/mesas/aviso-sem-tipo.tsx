import Link from "next/link";

export function AvisoSemTipo() {
  return (
    <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      Nenhum tipo de mesa cadastrado.{" "}
      <Link href="/tipos-mesa/novo" className="link">
        Crie um tipo de mesa
      </Link>{" "}
      antes de cadastrar mesas.
    </div>
  );
}
