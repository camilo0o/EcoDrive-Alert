export type LatLng = [latitude: number, longitude: number];

export type DashboardRoute = {
  id: string;
  nombre: string;
  longitudKm: number;
  codigoMtop?: string;
  kmsDisponibles?: number[];
};

export type DashboardSpecies = {
  id: string;
  nombre: string;
  nivelRiesgo: string;
  alias: string[];
  inaturalistTaxonId: number | null;
  nombreCientifico: string | null;
  fotoReferencia: string | null;
  atribucionFoto: string | null;
  licenciaFoto: string | null;
};

export type TaxonSuggestion = {
  id: number;
  nombreCientifico: string;
  nombreComun?: string;
  fotoReferencia?: string;
  atribucionFoto?: string;
  licenciaFoto?: string;
};

export type DashboardSighting = {
  id: string;
  especie: {
    id: string;
    nombre: string;
    nivelRiesgo: string;
    nombreCientifico: string | null;
    inaturalistTaxonId: number | null;
    fotoReferencia: string | null;
    atribucionFoto: string | null;
    licenciaFoto: string | null;
  } | null;
  rutaId: string | null;
  fechaHora: string;
  /** GeoJSON: [longitud, latitud] */
  ubicacion: { type: "Point"; coordinates: [number, number] };
  km: number | null;
  foto: string | null;
  descripcion: string | null;
  metodo: string;
  confianza: number | null;
  esAnonimo: boolean;
  esPropio: boolean;
  estado: string;
};

export type DashboardInitialData = {
  rutas: DashboardRoute[];
  rutaKmDisponible: boolean;
  errorRutaKm: string | null;
  especies: DashboardSpecies[];
  avistamientos: DashboardSighting[];
  total: number;
};

export type SightingFilters = { routeId: string; speciesId: string };

export type DashboardView = "map" | "reports";

/** Especie que el servidor reconoció en lo que dijo el conductor. */
export type VoiceSpecies = {
  especieId: string | null;
  inaturalistTaxonId: number | null;
  nombre: string;
  nombreCientifico: string | null;
  nivelRiesgo: string | null;
  fotoReferencia: string | null;
};

export type VoiceInterpretation =
  | { estado: "encontrada"; especie: VoiceSpecies }
  | { estado: "ambigua"; opciones: VoiceSpecies[] }
  | { estado: "no-entendida" };
