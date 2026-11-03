import { NextResponse } from "next/server";
import { getSession } from "./session";
import type { PublicUser } from "./auth.types";
import { getUserBySession } from "../services/auth.service";

export type RequireUserResult =
    | { ok: true; user: PublicUser }
    | { ok: false; response: NextResponse };

function unauthorized(): RequireUserResult {
    return {
        ok: false,
        response: NextResponse.json(
            { error: "Necesitás iniciar sesión." },
            { status: 401, headers: { "Cache-Control": "no-store" } },
        ),
    };
}

export async function requireUser(): Promise<RequireUserResult> {
    try {
        const session = await getSession();
        if (!session) return unauthorized();

        const user = await getUserBySession(session);
        if (!user) return unauthorized();

        return { ok: true, user };
    } catch (error) {
        console.error("Error verificando la sesión:", error);
        return {
            ok: false,
            response: NextResponse.json(
                { error: "No se pudo verificar la sesión." },
                { status: 500 },
            ),
        };
    }
}