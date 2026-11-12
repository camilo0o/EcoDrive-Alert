"use client";

import { useEffect, useState } from "react";
import type { LatLng } from "../types";

export function useTrayectoGps(trayectoId?: string) {
  const [error, setError] = useState("");
  const [location, setLocation] = useState<LatLng | null>(null);

  useEffect(() => {
    if (!trayectoId) {
      return;
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      const timer = window.setTimeout(() => setError("Este dispositivo no ofrece geolocalización."), 0);
      return () => window.clearTimeout(timer);
    }

    const geolocation = navigator.geolocation;
    let inFlight = false;
    let lastSentAt = 0;
    let active = true;

    const id = geolocation.watchPosition(
      async (position) => {
        if (inFlight || Date.now() - lastSentAt < 5000) return;
        inFlight = true;
        lastSentAt = Date.now();
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        if (active) setLocation([location.lat, location.lng]);

        try {
          const res = await fetch("/api/alertas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              trayectoId,
              location,
              radioMetros: 500,
            }),
          });

          if (!res.ok) {
            const body = await res.json().catch(() => null);
            throw new Error(typeof body?.error === "string" ? body.error : "No se pudo verificar alertas.");
          }
          const result = await res.json().catch(() => null) as { creadas?: number } | null;
          if (result && result.creadas && result.creadas > 0) {
            window.dispatchEvent(new Event("ecodrive:alertas-actualizadas"));
          }
          if (active) {
            setError("");
          }
        } catch (error) {
          if (active) {
            const message = error instanceof Error ? error.message : "Error al verificar alertas.";
            setError(message);
            console.error("Error al verificar alertas:", error);
          }
        } finally {
          inFlight = false;
        }
      },
      (error) => {
        if (active) {
          setLocation(null);
          setError(`No se pudo obtener la ubicación GPS: ${error.message}`);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
      },
    );

    return () => {
      active = false;
      geolocation.clearWatch(id);
    };
  }, [trayectoId]);

  return { error, location };
}
