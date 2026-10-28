import { connection, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { isObjectId } from "@/lib/http/params";
import { obtenerAvistamiento } from "@/lib/services/avistamiento.service";

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    await connection();
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    const { id } = await params;
    if (!isObjectId(id)) {
        return NextResponse.json({ error: "Id inválido." }, { status: 400 });
    }

    try {
        const avistamiento = await obtenerAvistamiento(id, auth.user.id);
        if (!avistamiento) {
            return NextResponse.json({ error: "Avistamiento no encontrado." }, { status: 404 });
        }
        return NextResponse.json({ avistamiento });
    } catch (error) {
        console.error("Error obteniendo avistamiento:", error);
        return NextResponse.json({ error: "No se pudo obtener el avistamiento." }, { status: 500 });
    }
}