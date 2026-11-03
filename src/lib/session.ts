import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE = "sessao";
const DURACAO_MS = 7 * 24 * 60 * 60 * 1000;

export type Perfil = "gerente" | "mestre";
export type Sessao = { perfil: Perfil; id: number; expiraEm: string };

function chave() {
  const segredo = process.env.SESSION_SECRET;
  if (!segredo || segredo.length < 32) {
    throw new Error("SESSION_SECRET ausente ou curto demais (mínimo 32 caracteres).");
  }
  return new TextEncoder().encode(segredo);
}

export async function assinar(sessao: Sessao) {
  return new SignJWT(sessao)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(chave());
}

export async function lerToken(token: string | undefined): Promise<Sessao | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, chave(), { algorithms: ["HS256"] });
    if (typeof payload.id !== "number") return null;
    if (payload.perfil !== "gerente" && payload.perfil !== "mestre") return null;
    return { perfil: payload.perfil, id: payload.id, expiraEm: String(payload.expiraEm) };
  } catch {
    return null;
  }
}

export async function criarSessao(perfil: Perfil, id: number) {
  const expiraEm = new Date(Date.now() + DURACAO_MS);
  const token = await assinar({ perfil, id, expiraEm: expiraEm.toISOString() });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: cookieSeguro(),
    sameSite: "lax",
    expires: expiraEm,
    path: "/",
  });
}

/**
 * Cookie só trafega em HTTPS? Padrão: sim em produção. Em instalação local acessada
 * pela rede (http://192.168...), defina COOKIE_SECURE="false", senão o login falha.
 */
function cookieSeguro() {
  const v = process.env.COOKIE_SECURE?.trim().toLowerCase();
  if (v === "false" || v === "0") return false;
  if (v === "true" || v === "1") return true;
  return process.env.NODE_ENV === "production";
}

export async function lerSessao() {
  return lerToken((await cookies()).get(COOKIE)?.value);
}

export async function encerrarSessao() {
  (await cookies()).delete(COOKIE);
}

export const NOME_COOKIE_SESSAO = COOKIE;

/** Página inicial de cada perfil. */
export function inicioDoPerfil(perfil: Perfil) {
  return perfil === "mestre" ? "/mestre" : "/";
}
