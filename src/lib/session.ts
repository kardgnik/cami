import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE = "sessao";
const DURACAO_MS = 7 * 24 * 60 * 60 * 1000;

export type Sessao = { gerenteId: number; expiraEm: string };

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
    if (typeof payload.gerenteId !== "number") return null;
    return { gerenteId: payload.gerenteId, expiraEm: String(payload.expiraEm) };
  } catch {
    return null;
  }
}

export async function criarSessao(gerenteId: number) {
  const expiraEm = new Date(Date.now() + DURACAO_MS);
  const token = await assinar({ gerenteId, expiraEm: expiraEm.toISOString() });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiraEm,
    path: "/",
  });
}

export async function lerSessao() {
  return lerToken((await cookies()).get(COOKIE)?.value);
}

export async function encerrarSessao() {
  (await cookies()).delete(COOKIE);
}

export const NOME_COOKIE_SESSAO = COOKIE;
