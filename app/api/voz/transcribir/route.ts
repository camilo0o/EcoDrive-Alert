import { connection, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { getGroq } from "@/lib/voz/groq";

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB: sobra para unos segundos de voz

export async function POST(request: Request) {
    await connection();
    const auth = await requireUser();
    if (!auth.ok) return auth.response;

    try {
        const limit = await consumeRateLimit("voz-transcribir", auth.user.id, 15, 60);
        if (!limit.allowed) {
            return NextResponse.json(
                { error: "Demasiados audios seguidos. Esperá un momento." },
                { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
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