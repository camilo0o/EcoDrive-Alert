import { connection, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/require-user";
import { EstadoAvistamiento } from "@/lib/enums";
import { isObjectId } from "@/lib/http/params";
import { crearAvistamiento, listarAvistamientos } from "@/lib/services/avistamiento.service";

const objectId = z.string().refine(isObjectId, "Id inválido");

const querySchema = z.object({
    estado: z.nativeEnum(EstadoAvistamiento).default(EstadoAvistamiento.ACTIVO),
    rutaId: objectId.optional(),
    especieId: objectId.optional(),
    limit: z.coerce.number().int().min(1).max(200).default(100),
    page: z.coerce.number().int().min(1).default(1),
});

const createSchema = z.object({
    especieId: objectId,
    rutaId: objectId.optional(),
    km: z.number().finite().min(0).optional(),
    coordinates: z.tuple([
        z.number().finite().min(-180).max(180),
        z.number().finite().min(-90).max(90),
    ]),
    descripcion: z.string().trim().max(500).optional(),
    esAnonimo: z.boolean().default(false),
}).strict();

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
        console.error("Error creando avistamiento:", error);
        return NextResponse.json({ error: "No se pudo registrar el avistamiento." }, { status: 500 });
    }
}