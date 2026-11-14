import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession, type SessionClaims } from "@/lib/auth/jwt";
import { ConfigError } from "@/lib/errors";

// Primera línea de defensa: protección de rutas y de roles ANTES de llegar a las páginas o a la API.
// (En Next.js 16 el antiguo `middleware.ts` se llama `proxy.ts`.)
// La autorización definitiva se repite en el backend (src/lib/api.ts y src/lib/auth/session.ts)
// leyendo el rol real desde la base de datos.

const PUBLIC_API = [/^\/api\/auth\/(login|register|logout)$/, /^\/api\/health$/];

function json(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");
  const isAdminArea = pathname === "/admin" || pathname.startsWith("/admin/") || pathname.startsWith("/api/admin");
  const isProtectedPage =
    pathname === "/chat" ||
    pathname.startsWith("/chat/") ||
    pathname === "/account" ||
    pathname === "/pastillero" ||
    pathname.startsWith("/pastillero/") ||
    isAdminArea;
  const isProtectedApi = isApi && !PUBLIC_API.some((re) => re.test(pathname));

  if (!isProtectedPage && !isProtectedApi) return NextResponse.next();

  let session: SessionClaims | null = null;
  try {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    session = token ? await verifySession(token) : null;
  } catch (err) {
    if (err instanceof ConfigError) {
      return new NextResponse(`Configuración incompleta del servidor: ${err.message}`, { status: 500 });
    }
    throw err;
  }

  if (isApi) {
    if (!session) return json(401, "UNAUTHENTICATED", "Debes iniciar sesión para continuar.");
    if (isAdminArea && session.role !== "ADMIN") {
      return json(403, "FORBIDDEN", "No tienes permisos para realizar esta acción.");
    }
    return NextResponse.next();
  }

  if (!session) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  if (isAdminArea && session.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/chat", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Excluye archivos estáticos y recursos internos de Next.js
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\..*).*)"],
};
