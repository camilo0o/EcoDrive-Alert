import type { LatLng } from "@/app/dashboard/types";

const ROUTING_BASE_URL = "https://router.project-osrm.org";
const MAX_ROUTE_POINTS = 25_000;

export type RouteCoordinates = {
  lat: number;
  lng: number;
};

export type CalculatedRoute = {
  coordinates: LatLng[];
  distanceMeters: number;
  durationSeconds: number;
};

export class RoutingServiceError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function calculateDrivingRoute(
  origin: RouteCoordinates,
  destination: RouteCoordinates,
): Promise<CalculatedRoute> {
  const coordinates = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
  const url = new URL(`/route/v1/driving/${coordinates}`, ROUTING_BASE_URL);
  url.searchParams.set("overview", "full");
  url.searchParams.set("geometries", "geojson");
  url.searchParams.set("steps", "false");

  let response: Response;
  try {
    response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
      headers: { Accept: "application/json" },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new RoutingServiceError("El servicio de rutas tardó demasiado. Inténtalo de nuevo.");
    }
    throw new RoutingServiceError("No se pudo conectar con el servicio de rutas.");
  }

  if (!response.ok) {
    throw new RoutingServiceError(`El servicio de rutas respondió con estado ${response.status}.`);
  }

  const body: unknown = await response.json().catch(() => null);
  if (!isRecord(body) || body.code !== "Ok" || !Array.isArray(body.routes) || !isRecord(body.routes[0])) {
    const serviceMessage = isRecord(body) && typeof body.code === "string" ? body.code : "respuesta inválida";
    throw new RoutingServiceError(`No se encontró un recorrido entre esos puntos (${serviceMessage}).`);
  }

  const route = body.routes[0];
  const distanceMeters = Number(route.distance);
  const durationSeconds = Number(route.duration);
  const geometry = isRecord(route.geometry) ? route.geometry.coordinates : null;
  if (
    !Number.isFinite(distanceMeters) || distanceMeters <= 0 ||
    !Number.isFinite(durationSeconds) || durationSeconds <= 0 ||
    !Array.isArray(geometry) || geometry.length < 2 || geometry.length > MAX_ROUTE_POINTS
  ) {
    throw new RoutingServiceError("El servicio de rutas devolvió un recorrido incompleto.");
  }

  const routeCoordinates: LatLng[] = [];
  for (const point of geometry) {
    if (
      !Array.isArray(point) || point.length < 2 ||
      typeof point[0] !== "number" || typeof point[1] !== "number" ||
      !Number.isFinite(point[0]) || !Number.isFinite(point[1]) ||
      point[0] < -180 || point[0] > 180 || point[1] < -90 || point[1] > 90
    ) {
      throw new RoutingServiceError("El servicio de rutas devolvió coordenadas inválidas.");
    }
    routeCoordinates.push([point[1], point[0]]);
  }

  return { coordinates: routeCoordinates, distanceMeters, durationSeconds };
}
