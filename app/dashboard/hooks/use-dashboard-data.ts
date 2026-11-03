"use client";

import { useCallback, useMemo, useState } from "react";
import { fetchDashboardData } from "../lib/api";
import type { DashboardInitialData, SightingFilters } from "../types";

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

/** Estado del panel: datos, filtros, carga, errores y estadísticas derivadas. */
export function useDashboardData(initialData: DashboardInitialData) {
  const [data, setData] = useState(initialData);
  const [filters, setFilters] = useState<SightingFilters>({ routeId: "", speciesId: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (nextFilters: SightingFilters) => {
    setLoading(true);
    setError("");
    try {
      setData(await fetchDashboardData(nextFilters));
    } catch (loadError) {
      console.error("Error cargando el panel:", loadError);
      setError(errorMessage(loadError, "No se pudo cargar la información."));
    } finally {
      setLoading(false);
    }
  }, []);

  function updateFilters(patch: Partial<SightingFilters>) {
    const nextFilters = { ...filters, ...patch };
    setFilters(nextFilters);
    void load(nextFilters);
  }

  const stats = useMemo(() => ({
    total: data.total,
    highRisk: data.avistamientos.filter((sighting) => sighting.especie?.nivelRiesgo === "ALTO").length,
    activeRoutes: new Set(data.avistamientos.map((sighting) => sighting.rutaId).filter(Boolean)).size,
  }), [data]);

  return {
    data,
    filters,
    loading,
    error,
    stats,
    setError,
    updateFilters,
    reload: () => load(filters),
  };
}
