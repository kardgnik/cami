import Link from "next/link";
import { Cabecalho, Vazio } from "@/components/ui";
import { exigirGerente } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { formatarMoeda } from "@/lib/format";

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
        descricao="Valor padrão pago ao mestre por sessão em cada tipo de mesa."
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
                <th className="num">Valor por sessão</th>
                <th className="num">Mesas</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {tipos.map((t) => (
                <tr key={t.id}>
                  <td className="font-medium">{t.nome}</td>
                  <td className="num">{formatarMoeda(t.valorSessaoCentavos)}</td>
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
        Mesas sem valor próprio usam o valor do seu tipo. Mudar o valor afeta só as sessões registradas daqui em diante:
        o valor fica gravado em cada sessão no momento do registro.
      </p>
    </>
  );
}
