"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Campo, Erro } from "@/components/form";
import { REGRA_USUARIO, type EstadoForm } from "@/lib/validations";

type Valores = { nome: string; usuario: string; email: string; telefone: string; chavePix: string };

export function MestreForm({
  acao,
  inicial,
  novo,
}: {
  acao: (estado: EstadoForm, formData: FormData) => Promise<EstadoForm>;
  inicial: Valores;
  novo: boolean;
}) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  const v = { ...inicial, ...estado.valores } as Valores;
  return (
    <form action={enviar} className="cartao max-w-2xl space-y-5 p-6">
      <Campo rotulo="Nome" name="nome" required defaultValue={v.nome} erros={estado.erros?.nome} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          rotulo="Usuário (para entrar no sistema)"
          name="usuario"
          required
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          defaultValue={v.usuario}
          erros={estado.erros?.usuario}
          ajuda={REGRA_USUARIO}
        />
        <Campo
          rotulo={novo ? "Senha inicial" : "Nova senha"}
          name="senha"
          type="password"
          autoComplete="new-password"
          required={novo}
          minLength={8}
          erros={estado.erros?.senha}
          ajuda={
            novo
              ? "O mestre usa este usuário e senha em /login. Mínimo de 8 caracteres."
              : "Deixe em branco para manter a senha atual."
          }
        />
        <Campo rotulo="Telefone (opcional)" name="telefone" type="tel" defaultValue={v.telefone} erros={estado.erros?.telefone} />
        <Campo rotulo="E-mail (opcional)" name="email" type="email" autoComplete="off" defaultValue={v.email} erros={estado.erros?.email} />
        <Campo
          rotulo="Chave Pix (opcional)"
          name="chavePix"
          defaultValue={v.chavePix}
          erros={estado.erros?.chavePix}
          ajuda="Aparece no resumo de pagamentos."
        />
      </div>
      <Erro mensagem={estado.mensagem} />
      <div className="flex gap-2">
        <button type="submit" disabled={pendente} className="btn-primario">
          {pendente ? "Salvando..." : "Salvar"}
        </button>
        <Link href="/mestres" className="btn-secundario">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
