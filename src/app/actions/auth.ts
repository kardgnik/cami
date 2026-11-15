"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { LimiteTentativas } from "@/lib/limite-tentativas";
import { criarSessao, encerrarSessao, inicioDoPerfil, type Perfil } from "@/lib/session";
import { loginSchema, validar, type EstadoForm } from "@/lib/validations";

// Hash fixo usado quando o usuário não existe, para o tempo de resposta não revelar isso.
const HASH_FALSO = "$2b$12$.eNcQYiOR77ta.L66jy3WuV7DzjYK9zaJ7p/vaZouuha0dYAPANB2";

// Freio contra adivinhação de senha, em janelas de 10 minutos:
// - 8 falhas do mesmo endereço para o mesmo usuário (quem erra trava só a si mesmo);
// - 30 falhas do mesmo endereço, somando todos os usuários;
// - 60 falhas para o mesmo usuário, somando todos os endereços (ataque distribuído).
const DEZ_MINUTOS = 10 * 60 * 1000;
type Limites = { usuarioNoIp: LimiteTentativas; ip: LimiteTentativas; usuario: LimiteTentativas };
const guardado = globalThis as unknown as { limiteLogin?: Limites };
const limite = (guardado.limiteLogin ??= {
  usuarioNoIp: new LimiteTentativas(8, DEZ_MINUTOS),
  ip: new LimiteTentativas(30, DEZ_MINUTOS),
  usuario: new LimiteTentativas(60, DEZ_MINUTOS),
});

/** Endereço de quem está acessando (atrás do túnel da Cloudflare vem em cabeçalhos). */
async function enderecoDoCliente() {
  const h = await headers();
  return h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}

/** Procura o usuário entre gerentes e, depois, entre mestres ativos. */
async function buscarConta(usuario: string): Promise<{ perfil: Perfil; id: number; senhaHash: string } | null> {
  const gerente = await prisma.gerente.findUnique({ where: { usuario } });
  if (gerente) return { perfil: "gerente", id: gerente.id, senhaHash: gerente.senhaHash };
  const mestre = await prisma.mestre.findUnique({ where: { usuario } });
  if (mestre?.ativo) return { perfil: "mestre", id: mestre.id, senhaHash: mestre.senhaHash };
  return null;
}

export async function entrar(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const r = validar(loginSchema, formData);
  if (!r.ok) return { ...r.estado, valores: { usuario: r.estado.valores?.usuario ?? "" } };

  const ip = await enderecoDoCliente();
  const chaves = { usuarioNoIp: `${r.dados.usuario}|${ip}`, ip, usuario: r.dados.usuario };
  const espera = Math.max(
    limite.usuarioNoIp.bloqueadoPor(chaves.usuarioNoIp),
    limite.ip.bloqueadoPor(chaves.ip),
    limite.usuario.bloqueadoPor(chaves.usuario),
  );
  if (espera > 0) {
    const minutos = Math.ceil(espera / 60);
    return {
      mensagem: `Muitas tentativas sem sucesso. Aguarde ${minutos} minuto${minutos === 1 ? "" : "s"} e tente de novo.`,
      valores: { usuario: r.dados.usuario },
    };
  }

  const conta = await buscarConta(r.dados.usuario);
  const senhaOk = await bcrypt.compare(r.dados.senha, conta?.senhaHash ?? HASH_FALSO);
  if (!conta || !senhaOk) {
    limite.usuarioNoIp.registrarFalha(chaves.usuarioNoIp);
    limite.ip.registrarFalha(chaves.ip);
    limite.usuario.registrarFalha(chaves.usuario);
    return { mensagem: "Usuário ou senha incorretos.", valores: { usuario: r.dados.usuario } };
  }
  limite.usuarioNoIp.limpar(chaves.usuarioNoIp);

  await criarSessao(conta.perfil, conta.id);
  const inicio = inicioDoPerfil(conta.perfil);
  const destino = String(formData.get("de") ?? "");
  // só aceita caminhos internos da área do próprio perfil (evita redirecionamento aberto)
  const interno = destino.startsWith("/") && !destino.startsWith("//");
  const daAreaDoMestre = destino === "/mestre" || destino.startsWith("/mestre/");
  const permitido = interno && daAreaDoMestre === (conta.perfil === "mestre");
  redirect(permitido ? destino : inicio);
}

export async function sair() {
  await encerrarSessao();
  redirect("/login");
}
