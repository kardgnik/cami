import Link from "next/link";
import { Cabecalho } from "@/components/ui";
import { exigirGerente } from "@/lib/dal";
import { hojeISO } from "@/lib/format";
import { criarAssinante } from "../actions";
import { AssinanteForm } from "../form";
import { carregarOpcoes } from "../opcoes";

export const metadata = { title: "Novo assinante · Gestão de Assinaturas" };

export default async function Page() {
  await exigirGerente();
  const opcoes = await carregarOpcoes();
  const faltando = [
    !opcoes.planos.length && { href: "/planos/novo", rotulo: "um plano" },
    !opcoes.plataformas.length && { href: "/plataformas/novo", rotulo: "uma plataforma" },
    !opcoes.metodos.length && { href: "/metodos-pagamento/novo", rotulo: "um método de pagamento" },
  ].filter((x) => x !== false);

  return (
    <>
      <Cabecalho titulo="Novo assinante" voltar={{ href: "/assinantes", rotulo: "Assinantes" }} />
      {faltando.length > 0 && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Antes de cadastrar assinantes, crie{" "}
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
      )}
      <AssinanteForm
        acao={criarAssinante}
        {...opcoes}
        inicial={{
          nome: "",
          email: "",
          telefone: "",
          status: "ATIVO",
          dataInicio: hojeISO(),
          observacoes: "",
          planoId: "",
          plataformaId: "",
          metodoPagamentoId: "",
        }}
      />
    </>
  );
}
