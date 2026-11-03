import { Cabecalho } from "@/components/ui";
import { exigirGerente } from "@/lib/dal";
import { criarPlataforma } from "../../_taxa/actions";
import { CONFIG_TAXA } from "../../_taxa/config";
import { TaxaForm } from "../../_taxa/form";

const c = CONFIG_TAXA.plataforma;

export default async function Page() {
  await exigirGerente();
  return (
    <>
      <Cabecalho titulo={c.novo} voltar={{ href: c.caminho, rotulo: c.plural }} />
      <TaxaForm acao={criarPlataforma} voltarPara={c.caminho} inicial={{ nome: "", taxaPercentualBp: "", taxaFixaCentavos: "" }} />
    </>
  );
}
