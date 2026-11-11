"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { useTrayectoGps } from "@/app/dashboard/hooks/use-trayecto-gps";
import { AlertasPanel } from "./alertas-panel";

type Trayecto = {
  id: string;
  origenNombre: string;
  destinoNombre: string;
};

type Ubicacion = {
  lat: number;
  lng: number;
};

function obtenerUbicacionActual(): Promise<Ubicacion> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Este dispositivo no ofrece geolocalización."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ lat: coords.latitude, lng: coords.longitude }),
      (error) => reject(new Error(`No se pudo obtener tu ubicación: ${error.message}`)),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
    );
  });
}

async function leerError(response: Response, mensajePorDefecto: string) {
  const body = await response.json().catch(() => null);
  return typeof body?.error === "string" ? body.error : mensajePorDefecto;
}

export function TrayectoPanel() {
  const [trayecto, setTrayecto] = useState<Trayecto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [destinoNombre, setDestinoNombre] = useState("");
  const gps = useTrayectoGps(trayecto?.id);

  const cargarTrayecto = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/trayectos", { signal, cache: "no-store" });
      if (!response.ok) throw new Error(await leerError(response, "No se pudo consultar el trayecto activo."));
      const data = await response.json();
      setTrayecto(data.trayecto ?? null);
    } catch (loadError) {
      if (loadError instanceof DOMException && loadError.name === "AbortError") return;
      setError(loadError instanceof Error ? loadError.message : "No se pudo consultar el trayecto activo.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void cargarTrayecto(controller.signal);
    return () => controller.abort();
  }, [cargarTrayecto]);

  async function iniciarTrayecto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const origen = await obtenerUbicacionActual();
      const response = await fetch("/api/trayectos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origen,
          destinoNombre: destinoNombre.trim(),
        }),
      });

      if (!response.ok) throw new Error(await leerError(response, "No se pudo iniciar el trayecto."));
      const data = await response.json();
      setTrayecto(data.trayecto);
      setDestinoNombre("");
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : "No se pudo iniciar el trayecto.");
    } finally {
      setSaving(false);
    }
  }

  async function finalizarTrayecto() {
    if (!trayecto) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/trayectos/${trayecto.id}`, { method: "PATCH" });
      if (!response.ok) throw new Error(await leerError(response, "No se pudo finalizar el trayecto."));
      setTrayecto(null);
    } catch (finishError) {
      setError(finishError instanceof Error ? finishError.message : "No se pudo finalizar el trayecto.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-labelledby="trayecto-heading" className="rounded-2xl border border-brand/15 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-accent">Seguridad en ruta</p>
          <h2 id="trayecto-heading" className="mt-1 text-xl font-bold text-brand-strong">
            {trayecto ? "Trayecto en curso" : "Inicia un trayecto"}
          </h2>
        </div>
        {trayecto && (
          <Button disabled={saving} onClick={() => void finalizarTrayecto()} size="sm" variant="secondary">
            {saving ? "Finalizando..." : "Finalizar trayecto"}
          </Button>
        )}
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-muted" role="status">Consultando trayecto activo...</p>
      ) : trayecto ? (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-muted">
            {trayecto.origenNombre} → {trayecto.destinoNombre}
          </p>
          {gps.error && <p className="text-sm text-danger" role="alert">{gps.error}</p>}
          <AlertasPanel trayectoId={trayecto.id} />
        </div>
      ) : (
        <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={(event) => void iniciarTrayecto(event)}>
          <p className="text-sm text-muted sm:col-span-2">
            El origen y el seguimiento se obtienen del GPS de este dispositivo. Indica el nombre del destino;
            sus coordenadas no son necesarias para recibir alertas de fauna.
          </p>
          <label className="grid gap-1 text-sm font-medium text-brand-strong sm:col-span-2">
            Destino
            <input
              autoComplete="off"
              className="rounded-lg border border-line-strong px-3 py-2"
              maxLength={100}
              onChange={(event) => setDestinoNombre(event.target.value)}
              required
              value={destinoNombre}
            />
          </label>
          <div className="sm:col-span-2">
            <Button disabled={saving} type="submit">
              {saving ? "Obteniendo GPS..." : "Iniciar trayecto y alertas"}
            </Button>
          </div>
        </form>
      )}

      {error && <p className="mt-4 text-sm text-danger" role="alert">{error}</p>}
    </section>
  );
}
