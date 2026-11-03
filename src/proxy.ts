import { NextResponse, type NextRequest } from "next/server";
import { inicioDoPerfil, lerToken, NOME_COOKIE_SESSAO } from "@/lib/session";

/**
 * Checagem otimista: só lê o cookie, sem consultar o banco. A verificação
 * definitiva acontece em cada página e server action (lib/dal.ts).
 *
 * - /login: quem já tem sessão vai para o início do seu perfil.
 * - /mestre/*: só mestres.
 * - demais rotas: só o gerente.
 */
export default async function proxy(req: NextRequest) {
  const caminho = req.nextUrl.pathname;
  const sessao = await lerToken(req.cookies.get(NOME_COOKIE_SESSAO)?.value);

  if (caminho === "/login") {
    return sessao && !req.nextUrl.searchParams.has("inativo")
      ? NextResponse.redirect(new URL(inicioDoPerfil(sessao.perfil), req.nextUrl))
      : NextResponse.next();
  }
  if (!sessao) {
    const url = new URL("/login", req.nextUrl);
    if (caminho !== "/") url.searchParams.set("de", caminho);
    return NextResponse.redirect(url);
  }
  const areaDoMestre = caminho === "/mestre" || caminho.startsWith("/mestre/");
  if (areaDoMestre !== (sessao.perfil === "mestre")) {
    return NextResponse.redirect(new URL(inicioDoPerfil(sessao.perfil), req.nextUrl));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|jpg|ico)$).*)"],
};
