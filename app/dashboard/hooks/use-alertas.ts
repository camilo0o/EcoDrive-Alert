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
      const res = await fetch(`/api/alertas?trayectoId=${trayectoId}`);
      if (!res.ok) throw new Error("No se pudieron cargar las alertas");

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
      const res = await fetch(`/api/alertas/${alertaId}`, { method: "PATCH" });
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

    fetchAlertas();
    const timer = setInterval(fetchAlertas, 10000);

    return () => clearInterval(timer);
  }, [fetchAlertas, trayectoId]);

  return { alertas, error, loading, fetchAlertas, marcarComoVista };
}