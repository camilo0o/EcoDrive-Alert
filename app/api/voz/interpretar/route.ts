import { connection, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/require-user";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { INaturalistApiError } from "@/lib/services/inaturalist.service";
import { interpretarTexto } from "@/lib/services/interpretacion-voz.service";

const bodySchema = z.object({ texto: z.string().trim().min(1).max(500) }).strict();

export async function POST(request: Request) {
    await connection();
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    try {
        const limit = await consumeRateLimit("voz-interpretar", auth.user.id, 30, 60);
        if (!limit.allowed) {
            return NextResponse.json(
                { error: "Demasiados intentos seguidos. Esperá un momento." },
                { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
            );
        }
    } catch (error) {
        console.error("Error aplicando límite de interpretación:", error);
        return NextResponse.json({ error: "No se pudo interpretar el texto." }, { status: 500 });
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "El cuerpo debe ser JSON válido." }, { status: 400 });
    }

    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: "Falta el texto a interpretar." }, { status: 400 });
    }

    try {
        // "No entendí" también es 200: la petición salió bien, solo que no hubo coincidencia.
        return NextResponse.json(await interpretarTexto(parsed.data.texto));
    } catch (error) {
        console.error("Error interpretando texto:", error);
        if (error instanceof INaturalistApiError) {
            return NextResponse.json({ error: "No se pudo consultar iNaturalist. Intentá nuevamente." }, { status: 502 });
        }
        return NextResponse.json({ error: "No se pudo interpretar el texto." }, { status: 500 });
    }
}
