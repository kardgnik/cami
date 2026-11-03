import { Cabecalho } from "@/components/ui";
import { exigirGerente } from "@/lib/dal";
import { criarTipoMesa } from "../actions";
import { TipoMesaForm } from "../form";

export default async function Page() {
  await exigirGerente();
  return (
    <>
      <Cabecalho titulo="Novo tipo de mesa" voltar={{ href: "/tipos-mesa", rotulo: "Tipos de mesa" }} />
      <TipoMesaForm acao={criarTipoMesa} inicial={{ nome: "", valorSessaoCentavos: "35,00" }} />
    </>
  );
}
