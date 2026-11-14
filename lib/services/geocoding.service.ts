import { z } from "zod";

const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org/search";

const placeSchema = z.object({
  lat: z.string(),
  lon: z.string(),
  display_name: z.string().min(1),
});

const responseSchema = z.array(placeSchema);

export type GeocodedDestination = {
  lat: number;
  lng: number;
  nombre: string;
};

export class GeocodingServiceError extends Error {}

export async function geocodeDestination(query: string): Promise<GeocodedDestination | null> {
  const url = new URL(NOMINATIM_BASE_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "uy");
  url.searchParams.set("accept-language", "es");

  let response: Response;
  try {
    response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
      headers: {
        Accept: "application/json",
        "User-Agent": "EcoDrive-Alert/0.1 (https://github.com/camilo0o/EcoDrive-Alert)",
      },
    });
  } catch (error) {
    const message = error instanceof Error && error.name === "TimeoutError"
      ? "La búsqueda del destino tardó demasiado. Inténtalo de nuevo."
      : "No se pudo conectar con el servicio de búsqueda de lugares.";
    throw new GeocodingServiceError(message, { cause: error });
  }

  if (!response.ok) {
    throw new GeocodingServiceError(`El servicio de búsqueda de lugares respondió con estado ${response.status}.`);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    throw new GeocodingServiceError("El servicio de búsqueda de lugares devolvió una respuesta inválida.", { cause: error });
  }

  const parsed = responseSchema.safeParse(body);
  if (!parsed.success) {
    throw new GeocodingServiceError("La respuesta de búsqueda de lugares no tiene el formato esperado.", {
      cause: parsed.error,
    });
  }

  const place = parsed.data[0];
  if (!place) return null;

  const lat = Number(place.lat);
  const lng = Number(place.lon);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    throw new GeocodingServiceError("El servicio de búsqueda de lugares devolvió coordenadas inválidas.");
  }

  return { lat, lng, nombre: place.display_name };
}
