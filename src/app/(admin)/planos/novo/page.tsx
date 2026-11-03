import { Cabecalho } from "@/components/ui";
import { exigirGerente } from "@/lib/dal";
import { criarPlano } from "../actions";
import { PlanoForm } from "../form";

export default async function Page() {
  await exigirGerente();
  return (
    <>
      <Cabecalho titulo="Novo plano" voltar={{ href: "/planos", rotulo: "Planos" }} />
      <PlanoForm acao={criarPlano} inicial={{ nome: "", descricao: "", valorCentavos: "", periodicidade: "MENSAL" }} />
    </>
  );
}
