import Link from "next/link";
import { BotaoEnviar } from "@/components/botao-confirmar";
import { Cabecalho, SeloAtivo, Vazio } from "@/components/ui";
import { calcularTaxa } from "@/lib/finance";
import { descreverTaxa, formatarMoeda } from "@/lib/format";
import { CONFIG_TAXA, type TipoTaxa } from "./config";

export type LinhaTaxa = {
  id: number;
  nome: string;
  taxaPercentualBp: number;
  taxaFixaCentavos: number;
  ativo: boolean;
  _count: { assinaturas: number };
};

export function ListaTaxa({
  tipo,
  linhas,
  alternar,
}: {
  tipo: TipoTaxa;
  linhas: LinhaTaxa[];
  alternar: (id: number) => Promise<void>;
}) {
  const c = CONFIG_TAXA[tipo];
  return (
    <>
      <Cabecalho
        titulo={c.plural}
        descricao={c.descricao}
        acoes={
          <Link href={`${c.caminho}/novo`} className="btn-primario">
            + {c.novo}
          </Link>
        }
      />
      <div className="cartao overflow-x-auto">
        {linhas.length === 0 ? (
          <Vazio>Nenhum cadastro ainda.</Vazio>
        ) : (
          <table className="tabela">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Taxa</th>
                <th className="num">Taxa em R$ 100</th>
                <th className="num">Assinaturas</th>
                <th>Status</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.id} className={l.ativo ? "" : "text-slate-400"}>
                  <td className="font-medium">{l.nome}</td>
                  <td>{descreverTaxa(l)}</td>
                  <td className="num">{formatarMoeda(calcularTaxa(10_000, l))}</td>
                  <td className="num">{l._count.assinaturas}</td>
                  <td>
                    <SeloAtivo ativo={l.ativo} />
                  </td>
                  <td>
                    <div className="flex justify-end gap-2">
                      <Link href={`${c.caminho}/${l.id}`} className="btn-secundario">
                        Editar
                      </Link>
                      <form action={alternar.bind(null, l.id)}>
                        <BotaoEnviar className="btn-secundario" pendente="...">
                          {l.ativo ? "Desativar" : "Ativar"}
                        </BotaoEnviar>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Desativar não apaga: assinaturas existentes continuam vinculadas, mas {c.artigo} {c.singular} deixa de aparecer
        para novos cadastros.
      </p>
    </>
  );
}
