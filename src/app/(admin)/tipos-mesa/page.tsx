import Link from "next/link";
import { Cabecalho, Vazio } from "@/components/ui";
import { exigirGerente } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { formatarMoeda, paraInput } from "@/lib/format";
import { valorOneshot } from "@/lib/sessoes";
import { OneshotForm } from "./oneshot-form";

export const metadata = { title: "Tipos de mesa · Gestão de Mesas" };

export default async function Page() {
  await exigirGerente();
  const tipos = await prisma.tipoMesa.findMany({
    orderBy: { nome: "asc" },
    include: { _count: { select: { mesas: true } } },
  });

  return (
    <>
      <Cabecalho
        titulo="Tipos de mesa"
        descricao="Como o mestre é pago em cada tipo de mesa: por sessão (sessão dupla paga o dobro) ou por aluno, por mês. Também o valor da oneshot."
        acoes={
          <Link href="/tipos-mesa/novo" className="btn-primario">
            + Novo tipo
          </Link>
        }
      />
      <div className="cartao overflow-x-auto">
        {tipos.length === 0 ? (
          <Vazio>
            Nenhum tipo de mesa ainda.{" "}
            <Link href="/tipos-mesa/novo" className="link">
              Crie o primeiro
            </Link>
            .
          </Vazio>
        ) : (
          <table className="tabela">
            <thead>
              <tr>
                <th>Tipo</th>
                <th className="num">Pagamento do mestre</th>
                <th className="num">Mesas</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {tipos.map((t) => (
                <tr key={t.id}>
                  <td className="font-medium">{t.nome}</td>
                  <td className="num">
                    {t.pagamentoMestre === "POR_ALUNO" ? (
                      <>
                        {formatarMoeda(t.valorAlunoCentavos)} <span className="text-xs text-slate-500">por aluno/mês</span>
                      </>
                    ) : (
                      <>
                        {formatarMoeda(t.valorSessaoCentavos)} <span className="text-xs text-slate-500">por sessão</span>
                      </>
                    )}
                  </td>
                  <td className="num">
                    <Link href={`/mesas?tipoMesaId=${t.id}`} className="link">
                      {t._count.mesas}
                    </Link>
                  </td>
                  <td>
                    <div className="flex justify-end">
                      <Link href={`/tipos-mesa/${t.id}`} className="btn-secundario">
                        Editar
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Mesas sem valor próprio usam o valor do seu tipo. Mudar o valor afeta só as sessões e mensalidades lançadas daqui
        em diante: o valor fica gravado em cada lançamento. Nos tipos pagos por aluno, a mensalidade do mês é lançada em
        Sessões e pagamentos.
      </p>
      <OneshotForm valorInicial={paraInput(await valorOneshot())} />
    </>
  );
}
