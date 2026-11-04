"use client";

import { useRef, useState } from "react";

/** iPhone graba en mp4 y Chrome/Android en webm: usamos el primero que soporte. */
function elegirFormato(): string | undefined {
    const formatos = ["audio/webm", "audio/mp4", "audio/ogg"];
    return formatos.find((f) => MediaRecorder.isTypeSupported(f));
}

export function useGrabadora() {
    const [grabando, setGrabando] = useState(false);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const pedazosRef = useRef<Blob[]>([]);

    async function empezar() {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mimeType = elegirFormato();
        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

        pedazosRef.current = [];
        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) pedazosRef.current.push(e.data);
        };

        recorder.start();
        recorderRef.current = recorder;
        setGrabando(true);
    }

    function detener(): Promise<Blob> {
        return new Promise((resolve, reject) => {
            const recorder = recorderRef.current;
            if (!recorder) return reject(new Error("No se está grabando."));

            recorder.onstop = () => {
                recorder.stream.getTracks().forEach((t) => t.stop()); // apaga el micrófono
                recorderRef.current = null;
                setGrabando(false);
                resolve(new Blob(pedazosRef.current, { type: recorder.mimeType }));
            };
            recorder.stop();
        });
    }

    return { grabando, empezar, detener };
}