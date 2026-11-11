import { postJson } from "@/lib/http/client";
import { MetodoReporte, NivelRiesgo } from "@/lib/enums";
import type { DashboardSighting, LatLng, VoiceInterpretation, VoiceSpecies } from "../types";

export async function transcribirAudio(audio: Blob): Promise<string> {
    const extension = audio.type.includes("mp4") ? "mp4" : audio.type.includes("ogg") ? "ogg" : "webm";

    const form = new FormData();
    form.append("audio", audio, `audio.${extension}`);

    let res: Response;
    try {
        res = await fetch("/api/voz/transcribir", { method: "POST", body: form });
    } catch {
        throw new Error("No se pudo conectar con el servidor.");
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "No se pudo transcribir.");

    return data.transcripcion as string;
}

export function interpretarTexto(texto: string) {
    return postJson<VoiceInterpretation>("/api/voz/interpretar", { texto }, "No se pudo interpretar lo que dijiste.");
}

/**
 * ¿Hay que pedirle el riesgo al conductor? Sí si la especie es nueva (viene de iNaturalist)
 * o si alguien ya la reportó antes con "No sé" y sigue SIN_CLASIFICAR.
 */
export function necesitaRiesgo(especie: VoiceSpecies): boolean {
    const sinNivel = !especie.nivelRiesgo || especie.nivelRiesgo === NivelRiesgo.SIN_CLASIFICAR;
    return sinNivel && especie.inaturalistTaxonId !== null;
}

/** Arma el cuerpo del POST: GPS + especie local o taxón de iNaturalist con el riesgo elegido. */
export function crearAvistamientoPorVoz(
    especie: VoiceSpecies,
    location: LatLng,
    transcripcion: string,
    nivelRiesgo: NivelRiesgo = NivelRiesgo.SIN_CLASIFICAR,
) {
    const [latitude, longitude] = location;
    // Mandamos el taxón (y no el id local) cuando hay que clasificar: el servidor solo
    // asigna el riesgo por ese camino, y nunca pisa un nivel que ya existía.
    const especieElegida = especie.especieId && !necesitaRiesgo(especie)
        ? { especieId: especie.especieId }
        : { inaturalistTaxonId: especie.inaturalistTaxonId, nivelRiesgo };

    return postJson<{ avistamiento: DashboardSighting }>(
        "/api/avistamientos",
        {
            ...especieElegida,
            locationMode: "gps",
            coordinates: [longitude, latitude], // GeoJSON va [lng, lat]
            esAnonimo: false,
            metodo: MetodoReporte.AUDIO,
            transcripcion,
        },
        "No se pudo registrar el avistamiento.",
    );
}
