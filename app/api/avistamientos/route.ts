import { connection, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/require-user";
import { EstadoAvistamiento, MetodoReporte, NivelRiesgo } from "@/lib/enums";
import { isObjectId } from "@/lib/http/params";
import { AvistamientoInvalidoError, crearAvistamiento, listarAvistamientos } from "@/lib/services/avistamiento.service";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { INaturalistApiError } from "@/lib/services/inaturalist.service";
import { MtopRutaApiError } from "@/lib/services/mtop-rutas.service";

const objectId = z.string().refine(isObjectId, "Id inválido");

const querySchema = z.object({
    estado: z.nativeEnum(EstadoAvistamiento).default(EstadoAvistamiento.ACTIVO),
    rutaId: objectId.optional(),
    especieId: objectId.optional(),
    limit: z.coerce.number().int().min(1).max(200).default(100),
    page: z.coerce.number().int().min(1).default(1),
});

const createDetailsSchema = {
    especieId: objectId.optional(),
    inaturalistTaxonId: z.number().int().positive().optional(),
    nivelRiesgo: z.enum([
        NivelRiesgo.BAJO,
        NivelRiesgo.MEDIO,
        NivelRiesgo.ALTO,
        NivelRiesgo.SIN_CLASIFICAR,
    ]).optional(),
    descripcion: z.string().trim().max(500).optional(),
    esAnonimo: z.boolean().default(false),
    // AUTOMATICO queda afuera: ese lo marca el servidor, no el cliente.
    metodo: z.enum([MetodoReporte.MANUAL, MetodoReporte.AUDIO]).default(MetodoReporte.MANUAL),
    transcripcion: z.string().trim().min(1).max(500).optional(),
};

const createSchema = z.discriminatedUnion("locationMode", [
    z.object({
        ...createDetailsSchema,
        locationMode: z.literal("gps"),
        coordinates: z.tuple([
            z.number().finite().min(-180).max(180),
            z.number().finite().min(-90).max(90),
        ]),
    }).strict(),
    z.object({
        ...createDetailsSchema,
        locationMode: z.literal("route-km"),
        rutaId: objectId,
        km: z.number().finite().min(0),
    }).strict(),
]).refine(
    (data) => Boolean(data.especieId) !== Boolean(data.inaturalistTaxonId),
    "Selecciona una especie de iNaturalist.",
).refine(
    (data) => !data.inaturalistTaxonId || Boolean(data.nivelRiesgo),
    { path: ["nivelRiesgo"], message: "Indica el nivel de riesgo inicial de la especie." },
).refine(
    // Por voz no le pedimos al conductor que clasifique el riesgo; en el formulario sí.
    (data) => data.nivelRiesgo !== NivelRiesgo.SIN_CLASIFICAR || data.metodo === MetodoReporte.AUDIO,
    { path: ["nivelRiesgo"], message: "Selecciona un nivel de riesgo." },
).refine(
    (data) => (data.metodo === MetodoReporte.AUDIO) === Boolean(data.transcripcion),
    { path: ["transcripcion"], message: "La transcripción solo aplica a reportes por voz y es obligatoria en ellos." },
);

export async function GET(request: Request) {
    await connection();
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) {
        return NextResponse.json(
            { error: "Parámetros inválidos.", issues: parsed.error.flatten().fieldErrors },
            { status: 400 },
        );
    }
    try {
        const { items, total } = await listarAvistamientos(parsed.data, auth.user.id);
        return NextResponse.json({
            avistamientos: items,
            total,
            page: parsed.data.page,
            limit: parsed.data.limit,
        });
    } catch (error) {
        console.error("Error listando avistamientos:", error);
        return NextResponse.json({ error: "No se pudieron obtener los avistamientos." }, { status: 500 });
    }
}

export async function POST(request: Request) {
    await connection();
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    try {
        const limit = await consumeRateLimit(
            "avistamiento-crear",
            auth.user.id,
            10,
            60,
        );
        if (!limit.allowed) {
            return NextResponse.json(
                { error: "Estás reportando muy seguido. Esperá un momento." },
                {
                    status: 429,
                    headers: { "Retry-After": String(limit.retryAfterSeconds) },
                },
            );
        }
    } catch (error) {
        console.error("Error aplicando límite de avistamientos:", error);
        return NextResponse.json(
            { error: "No se pudo registrar el avistamiento." },
            { status: 500 },
        );
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "El cuerpo debe ser JSON válido." }, { status: 400 });
    }

    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: "Datos del avistamiento inválidos.", issues: parsed.error.flatten().fieldErrors },
            { status: 400 },
        );
    }

    try {
        const avistamiento = await crearAvistamiento(parsed.data, auth.user.id);
        if (!avistamiento) {
            return NextResponse.json({ error: "La especie o la ruta seleccionada no existe." }, { status: 400 });
        }
        return NextResponse.json({ avistamiento }, { status: 201 });
    } catch (error) {
        if (error instanceof AvistamientoInvalidoError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
        if (error instanceof INaturalistApiError) {
            console.error("Error validando el taxón de iNaturalist:", error);
            return NextResponse.json(
                { error: "No se pudo validar la especie con iNaturalist. Intenta nuevamente." },
                { status: 502 },
            );
        }
        if (error instanceof MtopRutaApiError) {
            console.error("Error resolviendo la ruta y el km en el MTOP:", error);
            return NextResponse.json({ error: error.message }, { status: 422 });
        }
        console.error("Error creando avistamiento:", error);
        return NextResponse.json({ error: "No se pudo registrar el avistamiento." }, { status: 500 });
    }
}