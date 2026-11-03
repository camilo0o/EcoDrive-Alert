export type LatLng = [latitude: number, longitude: number];

export type DashboardRoute = { id: string; nombre: string; longitudKm: number };

export type DashboardSpecies = { id: string; nombre: string; nivelRiesgo: string; alias: string[] };

export type DashboardSighting = {
  id: string;
  especie: { id: string; nombre: string; nivelRiesgo: string } | null;
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
  especies: DashboardSpecies[];
  avistamientos: DashboardSighting[];
  total: number;
};

export type SightingFilters = { routeId: string; speciesId: string };

export type DashboardView = "map" | "reports";
