import Link from "next/link";

/** Aviso quando faltam cadastros básicos para criar uma assinatura. */
export function AvisoFaltando({
  planos,
  plataformas,
  metodos,
}: {
  planos: number;
  plataformas: number;
  metodos: number;
}) {
  const faltando = [
    !planos && { href: "/planos/novo", rotulo: "um plano" },
    !plataformas && { href: "/plataformas/novo", rotulo: "uma plataforma" },
    !metodos && { href: "/metodos-pagamento/novo", rotulo: "um método de pagamento" },
  ].filter((x) => x !== false);
  if (!faltando.length) return null;
  return (
    <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      Antes de criar assinaturas, cadastre{" "}
      {faltando.map((f, i) => (
        <span key={f.href}>
          {i > 0 && (i === faltando.length - 1 ? " e " : ", ")}
          <Link href={f.href} className="link">
            {f.rotulo}
          </Link>
        </span>
      ))}
      .
    </div>
  );
}
