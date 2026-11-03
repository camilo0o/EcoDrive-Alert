import { getJson, postJson } from "@/lib/http/client";
import type {
  DashboardInitialData,
  DashboardRoute,
  DashboardSighting,
  DashboardSpecies,
  SightingFilters,
} from "../types";

export async function fetchDashboardData(filters: SightingFilters): Promise<DashboardInitialData> {
  const params = new URLSearchParams({ limit: "100" });
  if (filters.routeId) params.set("rutaId", filters.routeId);
  if (filters.speciesId) params.set("especieId", filters.speciesId);

  const [routes, species, sightings] = await Promise.all([
    getJson<{ rutas: DashboardRoute[] }>("/api/rutas"),
    getJson<{ especies: DashboardSpecies[] }>("/api/especies"),
    getJson<{ avistamientos: DashboardSighting[]; total: number }>(`/api/avistamientos?${params.toString()}`),
  ]);

  return {
    rutas: routes.rutas,
    especies: species.especies,
    avistamientos: sightings.avistamientos,
    total: sightings.total,
  };
}

export async function fetchSighting(id: string) {
  const result = await getJson<{ avistamiento: DashboardSighting }>(
    `/api/avistamientos/${id}`,
    "No se pudo cargar el detalle.",
  );
  return result.avistamiento;
}

export type NewSighting = {
  especieId: string;
  rutaId: string;
  km: number;
  /** GeoJSON: [longitud, latitud] */
  coordinates: [number, number];
  descripcion?: string;
  esAnonimo: boolean;
};

/** Convierte los campos del formulario de reporte al cuerpo que espera la API. */
export function sightingFromForm(formData: FormData): NewSighting {
  const text = (name: string) => String(formData.get(name) ?? "").trim();
  const especieId = text("especieId");
  const rutaId = text("rutaId");
  const kmText = text("km");

  if (!especieId) throw new Error("Selecciona el animal que viste.");
  if (!rutaId) throw new Error("Selecciona una ruta.");
  if (!kmText) throw new Error("Indica el kilómetro del avistamiento.");

  const km = Number(kmText);
  if (!Number.isFinite(km) || km < 0) throw new Error("Indica un kilómetro válido.");

  return {
    especieId,
    rutaId,
    km,
    coordinates: [Number(text("longitude")), Number(text("latitude"))],
    descripcion: text("descripcion") || undefined,
    esAnonimo: formData.get("esAnonimo") === "on",
  };
}

export function createSighting(sighting: NewSighting) {
  return postJson<{ avistamiento: DashboardSighting }>(
    "/api/avistamientos",
    sighting,
    "No se pudo registrar el avistamiento.",
  );
}
