import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { COOKIE_PROPRIEDADE } from "@/lib/propriedade";

// Módulos que dependem de uma propriedade selecionada — sem o cookie, voltam para a Home.
const ROTAS_ESCOPADAS = [
  "/talhoes",
  "/tratamentos",
  "/estoque",
  "/atividades",
  "/maquinas",
  "/operadores",
  "/historico-pomar",
];

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isLoginPage = req.nextUrl.pathname.startsWith("/login");

  if (!isLoggedIn && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  if (isLoggedIn) {
    const precisaPropriedade = ROTAS_ESCOPADAS.some((rota) => req.nextUrl.pathname.startsWith(rota));
    if (precisaPropriedade && !req.cookies.get(COOKIE_PROPRIEDADE)) {
      return NextResponse.redirect(new URL("/", req.nextUrl));
    }
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|manifest.json|icons|images).*)"],
};
