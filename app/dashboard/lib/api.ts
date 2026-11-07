import { getJson, parseJson, postJson } from "@/lib/http/client";
import { NivelRiesgo } from "@/lib/enums";
import type {
  DashboardInitialData,
  DashboardRoute,
  DashboardSighting,
  DashboardSpecies,
  SightingFilters,
  TaxonSuggestion,
} from "../types";

export async function fetchDashboardData(filters: SightingFilters): Promise<DashboardInitialData> {
  const params = new URLSearchParams({ limit: "100" });
  if (filters.routeId) params.set("rutaId", filters.routeId);
  if (filters.speciesId) params.set("especieId", filters.speciesId);

  const [routes, species, sightings] = await Promise.all([
    getJson<{
      rutas: DashboardRoute[];
      rutaKmDisponible: boolean;
      errorRutaKm: string | null;
    }>("/api/rutas"),
    getJson<{ especies: DashboardSpecies[] }>("/api/especies"),
    getJson<{ avistamientos: DashboardSighting[]; total: number }>(`/api/avistamientos?${params.toString()}`),
  ]);

  return {
    rutas: routes.rutas,
    rutaKmDisponible: routes.rutaKmDisponible,
    errorRutaKm: routes.errorRutaKm,
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

type NewSightingDetails = {
  inaturalistTaxonId: number;
  nivelRiesgo: NivelRiesgo.BAJO | NivelRiesgo.MEDIO | NivelRiesgo.ALTO;
  descripcion?: string;
  esAnonimo: boolean;
};

export type NewSighting = NewSightingDetails & (
  | {
    locationMode: "gps";
    /** GeoJSON: [longitud, latitud] */
    coordinates: [number, number];
  }
  | {
    locationMode: "route-km";
    rutaId: string;
    km: number;
  }
);

export class SightingFormValidationError extends Error {}

/** Convierte los campos del formulario de reporte al cuerpo que espera la API. */
export function sightingFromForm(formData: FormData): NewSighting {
  const text = (name: string) => String(formData.get(name) ?? "").trim();
  const taxonIdText = text("inaturalistTaxonId");
  const nivelRiesgoText = text("nivelRiesgo");
  const locationMode = text("locationMode");

  if (!taxonIdText) throw new SightingFormValidationError("Busca y selecciona la especie que viste.");
  const inaturalistTaxonId = Number(taxonIdText);
  if (!Number.isSafeInteger(inaturalistTaxonId) || inaturalistTaxonId <= 0) {
    throw new SightingFormValidationError("Selecciona una especie válida de iNaturalist.");
  }
  if (
    nivelRiesgoText !== NivelRiesgo.BAJO &&
    nivelRiesgoText !== NivelRiesgo.MEDIO &&
    nivelRiesgoText !== NivelRiesgo.ALTO
  ) {
    throw new SightingFormValidationError("Selecciona un nivel de riesgo inicial.");
  }
  const details: NewSightingDetails = {
    inaturalistTaxonId,
    nivelRiesgo: nivelRiesgoText,
    descripcion: text("descripcion") || undefined,
    esAnonimo: formData.get("esAnonimo") === "on",
  };

  if (locationMode === "gps") {
    const longitudeText = text("longitude");
    const latitudeText = text("latitude");
    if (!longitudeText || !latitudeText) {
      throw new SightingFormValidationError("Obtén tu ubicación actual antes de registrar el avistamiento.");
    }
    const longitude = Number(longitudeText);
    const latitude = Number(latitudeText);
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180 ||
      !Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      throw new SightingFormValidationError("Obtén tu ubicación actual antes de registrar el avistamiento.");
    }
    return { ...details, locationMode, coordinates: [longitude, latitude] };
  }

  if (locationMode === "route-km") {
    const rutaId = text("rutaId");
    if (!rutaId) throw new SightingFormValidationError("Selecciona una ruta oficial.");
    const kmText = text("km");
    if (!kmText) throw new SightingFormValidationError("Selecciona un kilómetro disponible en la ruta.");
    const km = Number(kmText);
    if (!Number.isFinite(km) || km < 0) {
      throw new SightingFormValidationError("Indica un kilómetro válido.");
    }
    return { ...details, locationMode, rutaId, km };
  }

  throw new SightingFormValidationError("Selecciona cómo indicar la ubicación del avistamiento.");
}

export async function searchTaxa(query: string, signal: AbortSignal): Promise<TaxonSuggestion[]> {
  const response = await fetch(`/api/especies/buscar?q=${encodeURIComponent(query)}`, { signal });
  const result = await parseJson<{ taxa: TaxonSuggestion[] }>(
    response,
    "No se pudieron buscar especies.",
  );
  return result.taxa;
}

export function createSighting(sighting: NewSighting) {
  return postJson<{ avistamiento: DashboardSighting }>(
    "/api/avistamientos",
    sighting,
    "No se pudo registrar el avistamiento.",
  );
}
