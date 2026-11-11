import { connection, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { getGroq } from "@/lib/voz/groq";

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB: sobra para unos segundos de voz
const LIMITE_POR_MINUTO = 15;
/** Tope diario por usuario: protege la cuota de Groq aunque alguien respete el límite por minuto. */
const LIMITE_POR_DIA = 200;

export async function POST(request: Request) {
    await connection();
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    try {
        const limit = await consumeRateLimit("voz-transcribir", auth.user.id, LIMITE_POR_MINUTO, 60);
        if (!limit.allowed) {
            return NextResponse.json(
                { error: "Demasiados audios seguidos. Esperá un momento." },
                { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
            );
        }

        const diario = await consumeRateLimit("voz-transcribir-dia", auth.user.id, LIMITE_POR_DIA, 86_400);
        if (!diario.allowed) {
            return NextResponse.json(
                { error: "Llegaste al límite diario de audios. Podés seguir reportando con el formulario." },
                { status: 429, headers: { "Retry-After": String(diario.retryAfterSeconds) } },
            );
        }
    } catch (error) {
        console.error("Error aplicando límite de transcripción:", error);
        return NextResponse.json({ error: "No se pudo procesar el audio." }, { status: 500 });
    }

    let audio: FormDataEntryValue | null;
    try {
        audio = (await request.formData()).get("audio");
    } catch {
        return NextResponse.json({ error: "El cuerpo debe ser multipart/form-data." }, { status: 400 });
    }

    if (!(audio instanceof File) || audio.size === 0 || audio.size > MAX_BYTES) {
        return NextResponse.json({ error: "Audio inválido o demasiado grande." }, { status: 400 });
    }

    try {
        const { text } = await getGroq().audio.transcriptions.create({
            file: audio,
            model: "whisper-large-v3-turbo",
            language: "es",
        });
        return NextResponse.json({ transcripcion: text.trim() });
    } catch (error) {
        console.error("Error transcribiendo audio:", error);
        return NextResponse.json({ error: "No se pudo transcribir el audio." }, { status: 502 });
    }
}