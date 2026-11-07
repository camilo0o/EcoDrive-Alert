import type { DashboardRoute, DashboardSighting } from "../types";

const dateFormatter = new Intl.DateTimeFormat("es-UY", { dateStyle: "medium", timeStyle: "short" });

export function formatDate(value: string) {
  return dateFormatter.format(new Date(value));
}

export function routeName(routes: DashboardRoute[], routeId: string | null) {
  return routes.find((route) => route.id === routeId)?.nombre ?? "Ruta";
}

/** "Ruta 1 · km 42" o "Ubicación GPS". */
export function sightingLocationLabel(sighting: DashboardSighting, routes: DashboardRoute[]) {
  if (!sighting.rutaId) return "Ubicación GPS";
  const km = sighting.km !== null ? ` · km ${sighting.km}` : "";
  return `${routeName(routes, sighting.rutaId)}${km}`;
}

export function reporterLabel(sighting: DashboardSighting) {
  if (sighting.esAnonimo) return "Reporte anónimo";
  return sighting.esPropio ? "Tu reporte" : "Usuario de la comunidad";
}

export function pluralizeReports(total: number) {
  return `${total} ${total === 1 ? "reporte" : "reportes"}`;
}
