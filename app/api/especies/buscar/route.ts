import { connection, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/require-user";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { buscarTaxonesINaturalist, INaturalistApiError } from "@/lib/services/inaturalist.service";

const querySchema = z.object({ q: z.string().trim().min(2).max(80) });

export async function GET(request: Request) {
    await connection();
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const parsed = querySchema.safeParse({
        q: new URL(request.url).searchParams.get("q") ?? "",
    });
    if (!parsed.success) {
        return NextResponse.json({ error: "Escribe al menos dos caracteres para buscar." }, { status: 400 });
    }

    try {
        const limit = await consumeRateLimit("inaturalist-buscar", auth.user.id, 30, 60);
        if (!limit.allowed) {
            return NextResponse.json(
                { error: "Se alcanzó el límite de búsquedas. Esperá un momento." },
                { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
            );
        }

        const taxa = await buscarTaxonesINaturalist(parsed.data.q);
        return NextResponse.json({ taxa });
    } catch (error) {
        console.error("Error buscando taxones en iNaturalist:", error);
        if (error instanceof INaturalistApiError) {
            return NextResponse.json(
                { error: "No se pudo consultar iNaturalist. Intenta nuevamente." },
                { status: 502 },
            );
        }
        return NextResponse.json({ error: "No se pudieron buscar especies." }, { status: 500 });
    }
}
