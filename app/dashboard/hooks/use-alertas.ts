"use client";

import { useCallback, useEffect, useState } from "react";

type Alerta = {
  _id: string;
  mensaje: string;
  distanciaKm: number;
  visto: boolean;
  fechaHora: string;
};

export function useAlertas(trayectoId?: string) {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchAlertas = useCallback(async () => {
    if (!trayectoId) return;

    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/alertas?trayectoId=${trayectoId}`, { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(typeof body?.error === "string" ? body.error : "No se pudieron cargar las alertas.");
      }

      const data = await res.json();
      setAlertas(data.alertas ?? []);
    } catch (error) {
      console.error(error);
      setError(error instanceof Error ? error.message : "No se pudieron cargar las alertas.");
    } finally {
      setLoading(false);
    }
  }, [trayectoId]);

  const marcarComoVista = useCallback(async (alertaId: string) => {
    try {
      const res = await fetch(`/api/alertas/${alertaId}`, { method: "PATCH", cache: "no-store" });
      if (!res.ok) throw new Error("No se pudo marcar la alerta como vista.");

      setAlertas((prev) => prev.filter((a) => a._id !== alertaId));
      setError("");
      return true;
    } catch (markError) {
      setError(markError instanceof Error ? markError.message : "No se pudo marcar la alerta como vista.");
      return false;
    }
  }, []);

  useEffect(() => {
    if (!trayectoId) return;

    const initialFetch = window.setTimeout(() => void fetchAlertas(), 0);
    const refreshOnCreation = () => void fetchAlertas();
    window.addEventListener("ecodrive:alertas-actualizadas", refreshOnCreation);
    const timer = setInterval(() => void fetchAlertas(), 5000);

    return () => {
      window.clearTimeout(initialFetch);
      clearInterval(timer);
      window.removeEventListener("ecodrive:alertas-actualizadas", refreshOnCreation);
    };
  }, [fetchAlertas, trayectoId]);

  return { alertas, error, loading, fetchAlertas, marcarComoVista };
}
