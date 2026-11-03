import { NextResponse } from "next/server";
import { getSession, sessionCookieName } from "@/lib/auth/session";
import { cerrarSesiones } from "@/lib/services/auth.service";

export async function POST() {
    const session = await getSession();

    if (session) {
        try {
            await cerrarSesiones(session.userId); 
        } catch (error) {
            console.error("Error cerrando sesión:", error);
            return NextResponse.json({ error: "No se pudo cerrar la sesión." }, { status: 500 });
        }
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(sessionCookieName, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax", // esto asegura que la cookie solo se envíe en solicitudes del mismo sitio
        path: "/",
        maxAge: 0,
    });
    return response;
}