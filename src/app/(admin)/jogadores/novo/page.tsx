import { Cabecalho } from "@/components/ui";
import { exigirGerente } from "@/lib/dal";
import { criarJogador } from "../actions";
import { JogadorForm } from "../jogador-form";

export const metadata = { title: "Novo jogador · Gestão de Mesas" };

export default async function Page() {
  await exigirGerente();
  return (
    <>
      <Cabecalho
        titulo="Novo jogador"
        descricao="Depois de salvar, você adiciona a assinatura e as mesas do jogador."
        voltar={{ href: "/jogadores", rotulo: "Jogadores" }}
      />
      <div className="max-w-2xl">
        <JogadorForm
          acao={criarJogador}
          cancelarPara="/jogadores"
          rotuloSalvar="Salvar e continuar"
          inicial={{ nome: "", email: "", telefone: "", observacoes: "" }}
        />
      </div>
    </>
  );
}
