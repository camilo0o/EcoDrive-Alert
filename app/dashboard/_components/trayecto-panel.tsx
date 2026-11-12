"use client";

import { useCallback, useEffect, useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { getDeviceLocation } from "@/app/dashboard/lib/geolocation";
import { getRouteProgress } from "@/app/dashboard/lib/route-progress";
import type { LatLng, NavigationMapState, NavigationRoute } from "@/app/dashboard/types";
import { useTrayectoGps } from "@/app/dashboard/hooks/use-trayecto-gps";
import { AlertasPanel } from "./alertas-panel";

type Trayecto = {
  id: string;
  origenNombre: string;
  destinoNombre: string;
  origen: { lat: number; lng: number };
  destino: { lat: number; lng: number } | null;
  distanciaKm: number | null;
  duracionEstimadaMin: number | null;
};

async function leerError(response: Response, mensajePorDefecto: string) {
  const body = await response.json().catch(() => null);
  return typeof body?.error === "string" ? body.error : mensajePorDefecto;
}

async function calcularRecorrido(origen: LatLng, destino: LatLng): Promise<NavigationRoute> {
  const response = await fetch("/api/trayectos/ruta", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      origen: { lat: origen[0], lng: origen[1] },
      destino: { lat: destino[0], lng: destino[1] },
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(await leerError(response, "No se pudo calcular el recorrido."));
  const data = await response.json() as { ruta?: NavigationRoute };
  if (!data.ruta || !Array.isArray(data.ruta.coordinates) || data.ruta.coordinates.length < 2) {
    throw new Error("El servicio no devolvió un recorrido válido.");
  }
  return data.ruta;
}

function mostrarDistancia(metros: number) {
  return metros < 1000 ? `${Math.round(metros)} m` : `${(metros / 1000).toFixed(1)} km`;
}

function mostrarDuracion(segundos: number) {
  const minutos = Math.max(1, Math.round(segundos / 60));
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return horas ? `${horas} h ${resto} min` : `${minutos} min`;
}

export function TrayectoPanel({
  navigation,
  onNavigationChange,
}: {
  navigation: NavigationMapState;
  onNavigationChange: Dispatch<SetStateAction<NavigationMapState>>;
}) {
  const [trayecto, setTrayecto] = useState<Trayecto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState("");
  const [destinoNombre, setDestinoNombre] = useState("");
  const gps = useTrayectoGps(trayecto?.id);
  const progress = useMemo(
    () => navigation.route && navigation.currentLocation
      ? getRouteProgress(navigation.route.coordinates, navigation.currentLocation)
      : null,
    [navigation.currentLocation, navigation.route],
  );

  const cargarTrayecto = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch("/api/trayectos", { signal, cache: "no-store" });
      if (!response.ok) throw new Error(await leerError(response, "No se pudo consultar el trayecto activo."));
      const data = await response.json() as { trayecto: Trayecto | null };
      const currentTrip = data.trayecto ?? null;
      setTrayecto(currentTrip);

      if (currentTrip?.destino) {
        const origin: LatLng = [currentTrip.origen.lat, currentTrip.origen.lng];
        const destination: LatLng = [currentTrip.destino.lat, currentTrip.destino.lng];
        onNavigationChange((current) => ({
          ...current,
          origin,
          destination,
          selectionMode: null,
          followUser: true,
          route: null,
        }));
        try {
          const route = await calcularRecorrido(origin, destination);
          if (!signal?.aborted) onNavigationChange((current) => ({ ...current, route }));
        } catch (routeError) {
          if (!signal?.aborted) setError(routeError instanceof Error ? routeError.message : "No se pudo recuperar el recorrido.");
        }
      } else if (currentTrip) {
        setError("Este trayecto activo es anterior al navegador A→B. Finalízalo e inicia uno nuevo para ver el recorrido.");
      }
    } catch (loadError) {
      if (loadError instanceof DOMException && loadError.name === "AbortError") return;
      setError(loadError instanceof Error ? loadError.message : "No se pudo consultar el trayecto activo.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [onNavigationChange]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void cargarTrayecto(controller.signal), 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [cargarTrayecto]);

  useEffect(() => {
    if (!trayecto || !gps.location) return;
    onNavigationChange((current) => ({
      ...current,
      currentLocation: gps.location,
      followUser: true,
    }));
  }, [gps.location, onNavigationChange, trayecto]);

  function elegirPunto(modo: "origin" | "destination") {
    setError("");
    onNavigationChange((current) => ({ ...current, selectionMode: modo, route: null }));
  }

  async function usarGpsComoOrigen() {
    setSaving(true);
    setError("");
    try {
      const location = await getDeviceLocation();
      onNavigationChange((current) => ({
        ...current,
        origin: location,
        currentLocation: location,
        selectionMode: null,
        route: null,
        followUser: false,
      }));
    } catch (locationError) {
      setError(locationError instanceof Error ? locationError.message : "No se pudo obtener la ubicación GPS.");
    } finally {
      setSaving(false);
    }
  }

  async function onCalculateRoute(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!navigation.origin || !navigation.destination) {
      setError("Selecciona los puntos A y B en el mapa antes de calcular el recorrido.");
      return;
    }

    setCalculating(true);
    setError("");
    onNavigationChange((current) => ({ ...current, route: null }));
    try {
      const route = await calcularRecorrido(navigation.origin, navigation.destination);
      onNavigationChange((current) => ({ ...current, route, selectionMode: null, followUser: false }));
    } catch (routeError) {
      setError(routeError instanceof Error ? routeError.message : "No se pudo calcular el recorrido.");
    } finally {
      setCalculating(false);
    }
  }

  async function iniciarTrayecto() {
    if (!navigation.origin || !navigation.destination || !navigation.route) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/trayectos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origen: { lat: navigation.origin[0], lng: navigation.origin[1] },
          destino: { lat: navigation.destination[0], lng: navigation.destination[1] },
          destinoNombre: destinoNombre.trim() || "Punto B",
          distanciaKm: Number((navigation.route.distanceMeters / 1000).toFixed(2)),
          duracionEstimadaMin: Math.max(1, Math.round(navigation.route.durationSeconds / 60)),
        }),
      });
      if (!response.ok) throw new Error(await leerError(response, "No se pudo iniciar la navegación."));
      const data = await response.json() as { trayecto: Trayecto };
      setTrayecto(data.trayecto);
      onNavigationChange((current) => ({ ...current, selectionMode: null, followUser: true }));
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : "No se pudo iniciar la navegación.");
    } finally {
      setSaving(false);
    }
  }

  async function finalizarTrayecto() {
    if (!trayecto) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/trayectos/${trayecto.id}`, { method: "PATCH", cache: "no-store" });
      if (!response.ok) throw new Error(await leerError(response, "No se pudo finalizar el trayecto."));
      setTrayecto(null);
      onNavigationChange((current) => ({ ...current, currentLocation: null, followUser: false }));
    } catch (finishError) {
      setError(finishError instanceof Error ? finishError.message : "No se pudo finalizar el trayecto.");
    } finally {
      setSaving(false);
    }
  }

  const selectingMessage = navigation.selectionMode === "origin"
    ? "Toca el mapa para colocar el punto A."
    : navigation.selectionMode === "destination"
      ? "Toca el mapa para colocar el punto B."
      : "Puedes usar tu GPS para A y seleccionar B tocando el mapa.";

  return (
    <section aria-labelledby="trayecto-heading" className="rounded-2xl border border-brand/15 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-accent">Navegación GPS</p>
          <h2 id="trayecto-heading" className="mt-1 text-xl font-bold text-brand-strong">
            {trayecto ? "Trayecto en curso" : "Planifica un recorrido"}
          </h2>
        </div>
        {trayecto && (
          <Button disabled={saving} onClick={() => void finalizarTrayecto()} size="sm" variant="secondary">
            {saving ? "Finalizando…" : "Finalizar trayecto"}
          </Button>
        )}
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-muted" role="status">Consultando trayecto activo…</p>
      ) : trayecto ? (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-muted">
            Punto A → {trayecto.destinoNombre}
            {trayecto.distanciaKm !== null && ` · ${trayecto.distanciaKm.toFixed(1)} km`}
          </p>
          {navigation.route && <p className="text-sm text-muted">Tiempo estimado: {mostrarDuracion(navigation.route.durationSeconds)}</p>}
          {progress && (
            <div aria-live="polite" className="rounded-lg bg-brand-soft/15 p-3">
              <div className="flex items-center justify-between gap-3 text-sm font-semibold text-brand-strong">
                <span>{progress.remainingMeters <= 100 ? "Llegaste al punto B" : `${mostrarDistancia(progress.remainingMeters)} restantes`}</span>
                <span>{progress.progressPercent}%</span>
              </div>
              <div aria-label={`Recorrido completado ${progress.progressPercent}%`} className="mt-2 h-2 overflow-hidden rounded-full bg-brand/10" role="progressbar" aria-valuenow={progress.progressPercent} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-full bg-brand" style={{ width: `${progress.progressPercent}%` }} />
              </div>
              {progress.distanceFromRouteMeters > 500 && <p className="mb-0 mt-2 text-xs text-muted">Te alejaste del recorrido. El avance se estima respecto de la ruta calculada.</p>}
            </div>
          )}
          {gps.error && <p className="text-sm text-danger" role="alert">{gps.error}</p>}
          <AlertasPanel gpsReady={Boolean(gps.location)} trayectoId={trayecto.id} />
        </div>
      ) : (
        <form className="mt-4 grid gap-4" onSubmit={(event) => void onCalculateRoute(event)}>
          <p className="text-sm text-muted">Usa tu ubicación o elige A y B haciendo clic en el mapa de avistamientos.</p>
          {navigation.selectionMode && <p className="m-0 rounded-lg bg-brand-soft/15 px-3 py-2 text-sm font-medium text-brand-strong" role="status">{selectingMessage}</p>}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-line p-3">
              <p className="mb-2 text-sm font-semibold text-brand-strong">Punto A · partida</p>
              <p className="mb-3 text-xs text-muted">
                {navigation.origin ? `${navigation.origin[0].toFixed(5)}, ${navigation.origin[1].toFixed(5)}` : "Sin seleccionar"}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button disabled={saving} onClick={() => void usarGpsComoOrigen()} size="sm" variant="secondary">
                  {saving ? "Buscando GPS…" : "Usar mi GPS"}
                </Button>
                <Button onClick={() => elegirPunto("origin")} size="sm" variant="secondary">Elegir A en el mapa</Button>
              </div>
            </div>
            <div className="rounded-xl border border-line p-3">
              <p className="mb-2 text-sm font-semibold text-brand-strong">Punto B · llegada</p>
              <p className="mb-3 text-xs text-muted">
                {navigation.destination ? `${navigation.destination[0].toFixed(5)}, ${navigation.destination[1].toFixed(5)}` : "Sin seleccionar"}
              </p>
              <Button onClick={() => elegirPunto("destination")} size="sm" variant="secondary">Elegir B en el mapa</Button>
            </div>
          </div>

          {navigation.route && (
            <div className="rounded-lg bg-brand-soft/15 p-3 text-sm text-brand-strong" role="status">
              Recorrido: <strong>{mostrarDistancia(navigation.route.distanceMeters)}</strong> · {mostrarDuracion(navigation.route.durationSeconds)}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="grid flex-1 gap-1 text-sm font-medium text-brand-strong">
              Nombre del destino
              <input
                autoComplete="off"
                className="rounded-lg border border-line-strong px-3 py-2"
                maxLength={100}
                onChange={(event) => setDestinoNombre(event.target.value)}
                placeholder="Ej. Terminal de Punta del Este"
                value={destinoNombre}
              />
            </label>
            <Button disabled={calculating || !navigation.origin || !navigation.destination} type="submit">
              {calculating ? "Calculando…" : navigation.route ? "Recalcular recorrido" : "Calcular recorrido"}
            </Button>
          </div>
          {navigation.route && (
            <Button disabled={saving} onClick={() => void iniciarTrayecto()} type="button">
              {saving ? "Iniciando GPS…" : "Iniciar navegación GPS y alertas"}
            </Button>
          )}
        </form>
      )}

      {error && <p className="mt-4 text-sm text-danger" role="alert">{error}</p>}
      {!trayecto && <p className="mb-0 mt-4 text-xs text-muted">La ruta y el avance se muestran en el mapa. El seguimiento GPS requiere permiso del navegador.</p>}
    </section>
  );
}
