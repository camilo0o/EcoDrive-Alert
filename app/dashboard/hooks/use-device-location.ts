"use client";

import { useCallback, useState } from "react";
import { getDeviceLocation } from "../lib/geolocation";
import type { LatLng } from "../types";

/** Pide la ubicación del dispositivo y guarda el resultado, el estado de carga y el error. */
export function useDeviceLocation() {
  const [location, setLocation] = useState<LatLng | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const locate = useCallback(async (): Promise<LatLng | null> => {
    setLoading(true);
    setError("");
    try {
      const coords = await getDeviceLocation();
      setLocation(coords);
      return coords;
    } catch (locationError) {
      setError(locationError instanceof Error ? locationError.message : "No se pudo obtener la ubicación.");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { location, setLocation, loading, error, locate };
}

export type DeviceLocation = ReturnType<typeof useDeviceLocation>;
