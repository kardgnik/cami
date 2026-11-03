import { Cabecalho } from "@/components/ui";
import { exigirMestre } from "@/lib/dal";
import { SenhaForm } from "./senha-form";

export const metadata = { title: "Trocar senha · Painel do mestre" };

export default async function Page() {
  await exigirMestre();
  return (
    <>
      <Cabecalho titulo="Trocar senha" voltar={{ href: "/mestre", rotulo: "Início" }} />
      <SenhaForm />
    </>
  );
}
