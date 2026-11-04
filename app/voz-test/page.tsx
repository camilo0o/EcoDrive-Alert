"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useGrabadora } from "@/app/dashboard/hooks/use-grabadora";
import { transcribirAudio } from "@/app/dashboard/lib/voz";

export default function VozTestPage() {
    const { grabando, empezar, detener } = useGrabadora();
    const [texto, setTexto] = useState("");
    const [error, setError] = useState("");
    const [cargando, setCargando] = useState(false);

    async function alternar() {
        setError("");
        try {
            if (!grabando) {
                await empezar();
                return;
            }
            setCargando(true);
            const audio = await detener();
            setTexto(await transcribirAudio(audio));
        } catch (e) {
            setError(e instanceof Error ? e.message : "Error desconocido.");
        } finally {
            setCargando(false);
        }
    }

    return (
        <main className="mx-auto grid max-w-md gap-4 p-6">
            <h1 className="text-xl font-semibold">Prueba de voz</h1>
            <Button onClick={alternar} disabled={cargando}>
                {cargando ? "Transcribiendo..." : grabando ? "Detener" : "Grabar"}
            </Button>
            {texto && <p>«{texto}»</p>}
            {error && <p className="text-red-600">{error}</p>}
        </main>
    );
}