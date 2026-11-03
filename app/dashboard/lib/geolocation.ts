import type { LatLng } from "../types";

function geolocationErrorMessage(error: GeolocationPositionError) {
  if (error.code === error.PERMISSION_DENIED) return "No se concedió permiso para acceder a la ubicación.";
  if (error.code === error.POSITION_UNAVAILABLE) return "No se pudo determinar la ubicación del dispositivo.";
  return "La solicitud de ubicación tardó demasiado. Inténtalo de nuevo.";
}

/** Envuelve la API del navegador en una promesa que devuelve [latitud, longitud]. */
export function getDeviceLocation(): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Este navegador no permite obtener la ubicación."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve([coords.latitude, coords.longitude]),
      (error) => reject(new Error(geolocationErrorMessage(error))),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  });
}
