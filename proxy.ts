import { NextResponse, type NextRequest } from "next/server";
import { sessionCookieName } from "@/lib/auth/session";

// Lista blanca: lo único que se puede ver sin sesion.
const RUTAS_PUBLICAS = ["/", "/login", "/register", "/api/db-check"];
const PREFIJOS_PUBLICOS = ["/api/auth/"];

function esPublica(pathname: string): boolean {
    return (
        RUTAS_PUBLICAS.includes(pathname) ||
        PREFIJOS_PUBLICOS.some((prefijo) => pathname.startsWith(prefijo))
    );
}

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (esPublica(pathname)) return NextResponse.next();

    const tieneSesion = request.cookies.has(sessionCookieName);
    if (tieneSesion) return NextResponse.next();

    if (pathname.startsWith("/api/")) {
        return NextResponse.json(
            { error: "Necesitás iniciar sesión." },
            { status: 401 },
        );
    }

    return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
    // No correr el proxy en archivos estáticos (CSS, JS, imágenes).
    matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico)$).*)"],
};