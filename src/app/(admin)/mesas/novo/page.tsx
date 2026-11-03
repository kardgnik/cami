import { Cabecalho } from "@/components/ui";
import { exigirGerente } from "@/lib/dal";
import { criarMesa } from "../actions";
import { AvisoSemTipo } from "../aviso-sem-tipo";
import { MesaForm } from "../form";
import { carregarOpcoesMesa } from "../opcoes";

export const metadata = { title: "Nova mesa · Gestão de Mesas" };

export default async function Page() {
  await exigirGerente();
  const opcoes = await carregarOpcoesMesa();
  return (
    <>
      <Cabecalho titulo="Nova mesa" voltar={{ href: "/mesas", rotulo: "Mesas" }} />
      {opcoes.tipos.length === 0 && <AvisoSemTipo />}
      <MesaForm
        acao={criarMesa}
        {...opcoes}
        inicial={{
          nome: "",
          descricao: "",
          tipoMesaId: opcoes.tipos.length === 1 ? String(opcoes.tipos[0].id) : "",
          mestreId: "",
          valorSessaoCentavos: "",
          sessoesPorMes: "2",
          capacidade: "6",
        }}
      />
    </>
  );
}
