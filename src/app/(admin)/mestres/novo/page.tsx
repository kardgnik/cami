import { Cabecalho } from "@/components/ui";
import { exigirGerente } from "@/lib/dal";
import { criarMestre } from "../actions";
import { MestreForm } from "../form";

export const metadata = { title: "Novo mestre · Gestão de Mesas" };

export default async function Page() {
  await exigirGerente();
  return (
    <>
      <Cabecalho titulo="Novo mestre" voltar={{ href: "/mestres", rotulo: "Mestres" }} />
      <MestreForm acao={criarMestre} novo inicial={{ nome: "", email: "", telefone: "", chavePix: "" }} />
    </>
  );
}
