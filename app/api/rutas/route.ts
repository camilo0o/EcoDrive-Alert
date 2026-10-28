import { connection, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { listarRutas } from "@/lib/services/ruta.service";

export async function GET() {
    await connection();
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    try {
        const rutas = await listarRutas();
        return NextResponse.json({ rutas });
    } catch (error) {
        console.error("Error listando rutas:", error);
        return NextResponse.json({ error: "No se pudieron obtener las rutas." }, { status: 500 });
    }
}