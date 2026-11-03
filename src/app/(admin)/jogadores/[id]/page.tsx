import Link from "next/link";
import { notFound } from "next/navigation";
import { BotaoConfirmar } from "@/components/botao-confirmar";
import { Cabecalho, SeloStatus } from "@/components/ui";
import { financeiroDaAssinatura } from "@/lib/assinaturas";
import { exigirGerente } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { formatarData, formatarMoeda } from "@/lib/format";
import { rotuloPeriodicidade } from "@/lib/labels";
import { atualizarJogador, excluirAssinatura, excluirJogador } from "../actions";
import { JogadorForm } from "../jogador-form";

export default async function Page(props: PageProps<"/jogadores/[id]">) {
  await exigirGerente();
  const id = Number((await props.params).id);
  if (!Number.isSafeInteger(id)) notFound();
  const jogador = await prisma.jogador.findUnique({
    where: { id },
    include: {
      assinaturas: {
        orderBy: [{ status: "asc" }, { dataInicio: "desc" }],
        include: {
          plano: true,
          plataforma: true,
          metodoPagamento: true,
          mesas: {
            include: {
              mesa: { select: { id: true, nome: true, tipoMesa: { select: { nome: true } }, mestre: { select: { nome: true } } } },
            },
          },
        },
      },
    },
  });
  if (!jogador) notFound();

  return (
    <>
      <Cabecalho
        titulo={jogador.nome}
        descricao={[jogador.telefone, jogador.email].filter(Boolean).join(" · ") || undefined}
        voltar={{ href: "/jogadores", rotulo: "Jogadores" }}
        acoes={
          <form action={excluirJogador.bind(null, jogador.id)}>
            <BotaoConfirmar
              className="btn-perigo"
              confirmacao={`Excluir ${jogador.nome}? As assinaturas e os vínculos com mesas também serão apagados. Esta ação não pode ser desfeita.`}
            >
              Excluir jogador
            </BotaoConfirmar>
          </form>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[22rem_1fr]">
        <section>
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Dados do jogador</h2>
          <JogadorForm
            acao={atualizarJogador.bind(null, jogador.id)}
            inicial={{
              nome: jogador.nome,
              email: jogador.email ?? "",
              telefone: jogador.telefone,
              observacoes: jogador.observacoes ?? "",
            }}
          />
        </section>

        <section className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900">Assinaturas</h2>
            <Link href={`/jogadores/${jogador.id}/assinaturas/nova`} className="btn-primario">
              + Nova assinatura
            </Link>
          </div>

          {jogador.assinaturas.length === 0 ? (
            <div className="cartao px-6 py-10 text-center text-sm text-slate-500">
              {jogador.nome} ainda não tem assinatura.{" "}
              <Link href={`/jogadores/${jogador.id}/assinaturas/nova`} className="link">
                Adicione a primeira
              </Link>{" "}
              para vincular o jogador às mesas.
            </div>
          ) : (
            <ul className="space-y-4">
              {jogador.assinaturas.map((a) => {
                const { porCobranca } = financeiroDaAssinatura(a);
                return (
                  <li key={a.id} className={`cartao p-5 ${a.status === "CANCELADO" ? "opacity-70" : ""}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {a.plano.nome}{" "}
                          <span className="text-sm font-normal text-slate-500">
                            · {rotuloPeriodicidade(a.plano.periodicidade)}
                          </span>
                        </p>
                        <p className="mt-0.5 text-sm text-slate-500">
                          {a.plataforma.nome} · {a.metodoPagamento.nome} · desde {formatarData(a.dataInicio)}
                        </p>
                      </div>
                      <SeloStatus status={a.status} />
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto]">
                      <div>
                        <p className="mb-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                          Mesas ({a.mesas.length} de {a.plano.limiteMesas})
                        </p>
                        {a.mesas.length === 0 ? (
                          <p className="text-sm text-slate-400">Nenhuma mesa vinculada.</p>
                        ) : (
                          <ul className="space-y-1 text-sm">
                            {a.mesas.map((v) => (
                              <li key={v.mesa.id}>
                                <Link href={`/mesas/${v.mesa.id}`} className="link">
                                  {v.mesa.nome}
                                </Link>{" "}
                                <span className="text-slate-500">
                                  · {v.mesa.tipoMesa.nome} · {v.mesa.mestre ? `Mestre: ${v.mesa.mestre.nome}` : "Sem mestre"}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <dl className="grid min-w-48 grid-cols-[auto_auto] gap-x-4 gap-y-1 text-sm sm:text-right">
                        <dt className="text-slate-500">Bruto</dt>
                        <dd className="tabular-nums">{formatarMoeda(porCobranca.bruto)}</dd>
                        <dt className="text-slate-500">Taxas</dt>
                        <dd className="tabular-nums text-slate-500">− {formatarMoeda(porCobranca.totalTaxas)}</dd>
                        <dt className="font-medium text-slate-700">Líquido</dt>
                        <dd
                          className={`font-semibold tabular-nums ${porCobranca.liquido > 0 ? "text-emerald-700" : "text-red-600"}`}
                        >
                          {formatarMoeda(porCobranca.liquido)}
                        </dd>
                      </dl>
                    </div>

                    {a.observacoes && <p className="mt-3 text-sm whitespace-pre-line text-slate-600">{a.observacoes}</p>}

                    <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
                      <Link href={`/jogadores/${jogador.id}/assinaturas/${a.id}`} className="btn-secundario">
                        Editar
                      </Link>
                      <form action={excluirAssinatura.bind(null, jogador.id, a.id)}>
                        <BotaoConfirmar
                          className="btn-perigo"
                          confirmacao={`Excluir a assinatura ${a.plano.nome} de ${jogador.nome}? Para manter o histórico, prefira marcar como cancelada.`}
                        >
                          Excluir
                        </BotaoConfirmar>
                      </form>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
