import { NextResponse } from "next/server";
import { getSessionUserId } from "./session";
import type { PublicUser } from "./auth.types";
import { getUserById } from "../services/auth.service";

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
        const userId = await getSessionUserId();
        if (!userId) return unauthorized();

        const user = await getUserById(userId);
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