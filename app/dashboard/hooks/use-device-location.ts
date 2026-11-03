"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getDeviceLocation } from "../lib/geolocation";
import type { LatLng } from "../types";

export const DEVICE_LOCATION_TTL_MS = 2 * 60 * 1000;

/** Pide la ubicación del dispositivo y la mantiene solo temporalmente en memoria. */
export function useDeviceLocation() {
  const [location, setLocation] = useState<LatLng | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const expirationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(false);
  const requestId = useRef(0);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      requestId.current += 1;
      if (expirationTimer.current) clearTimeout(expirationTimer.current);
    };
  }, []);

  const clearLocation = useCallback(() => {
    requestId.current += 1;
    if (expirationTimer.current) clearTimeout(expirationTimer.current);
    expirationTimer.current = null;
    setLocation(null);
    setError("");
    setLoading(false);
  }, []);

  const locate = useCallback(async (): Promise<LatLng | null> => {
    const currentRequestId = ++requestId.current;
    setLoading(true);
    setError("");
    try {
      const coords = await getDeviceLocation();
      if (!mounted.current || requestId.current !== currentRequestId) return null;
      setLocation(coords);
      if (expirationTimer.current) clearTimeout(expirationTimer.current);
      expirationTimer.current = setTimeout(() => {
        setLocation(null);
        expirationTimer.current = null;
      }, DEVICE_LOCATION_TTL_MS);
      return coords;
    } catch (locationError) {
      if (mounted.current && requestId.current === currentRequestId) {
        setError(locationError instanceof Error ? locationError.message : "No se pudo obtener la ubicación.");
      }
      return null;
    } finally {
      if (mounted.current && requestId.current === currentRequestId) setLoading(false);
    }
  }, []);

  return { location, loading, error, locate, clearLocation };
}

export type DeviceLocation = ReturnType<typeof useDeviceLocation>;
