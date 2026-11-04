export async function transcribirAudio(audio: Blob): Promise<string> {
    const extension = audio.type.includes("mp4") ? "mp4" : audio.type.includes("ogg") ? "ogg" : "webm";

    const form = new FormData();
    form.append("audio", audio, `audio.${extension}`);

    const res = await fetch("/api/voz/transcribir", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "No se pudo transcribir.");

    return data.transcripcion as string;
}