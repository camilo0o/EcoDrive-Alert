// @vitest-environment jsdom

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TrayectoPanel } from "@/app/dashboard/_components/trayecto-panel";
import type { NavigationMapState } from "@/app/dashboard/types";

const initialNavigation: NavigationMapState = {
  origin: [-34.9, -56.1],
  destination: [-34.9, -54.9],
  route: null,
  selectionMode: null,
  currentLocation: null,
  followUser: false,
};

function Harness() {
  const [navigation, setNavigation] = useState(initialNavigation);
  return <TrayectoPanel navigation={navigation} onNavigationChange={setNavigation} />;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  Reflect.deleteProperty(navigator, "geolocation");
  vi.unstubAllGlobals();
});

describe("TrayectoPanel", () => {
  it("calcula una ruta A→B, inicia el GPS y muestra al instante las alertas creadas", async () => {
    const trip = {
      id: "trayecto-1",
      origenNombre: "Punto A",
      destinoNombre: "Punta del Este",
      origen: { lat: -34.9, lng: -56.1 },
      destino: { lat: -34.9, lng: -54.9 },
      distanciaKm: 120,
      duracionEstimadaMin: 180,
    };
    const alert = {
      _id: "alerta-1",
      mensaje: "Atención: hay un carpincho cerca de tu ruta.",
      distanciaKm: 0.3,
      visto: false,
      fechaHora: "2026-11-12T15:00:00.000Z",
    };
    let positionCallback: PositionCallback | undefined;
    let alertCreated = false;
    const watchPosition = vi.fn((success: PositionCallback) => {
      positionCallback = success;
      return 7;
    });
    const clearWatch = vi.fn();
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { watchPosition, clearWatch },
    });

    const route = {
      coordinates: [[-34.9, -56.1], [-34.9, -55.5], [-34.9, -54.9]],
      distanceMeters: 120_000,
      durationSeconds: 10_800,
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/trayectos" && !init?.method) return jsonResponse({ trayecto: null });
      if (url === "/api/trayectos/ruta" && init?.method === "POST") return jsonResponse({ ruta: route });
      if (url === "/api/trayectos" && init?.method === "POST") return jsonResponse({ trayecto: trip }, 201);
      if (url.startsWith("/api/alertas?") && alertCreated) return jsonResponse({ alertas: [alert] });
      if (url.startsWith("/api/alertas?")) return jsonResponse({ alertas: [] });
      if (url === "/api/alertas" && init?.method === "POST") {
        alertCreated = true;
        return jsonResponse({ creadas: 1, alertas: [alert] }, 201);
      }
      throw new Error(`Solicitud inesperada: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<Harness />);

    fireEvent.click(await screen.findByRole("button", { name: "Calcular recorrido" }));
    expect(await screen.findByText(/120\.0 km/)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Iniciar navegación GPS y alertas" }));

    expect(await screen.findByText(/Punto A → Punta del Este/)).toBeVisible();
    await waitFor(() => expect(watchPosition).toHaveBeenCalledOnce());

    await act(async () => {
      positionCallback?.({
        coords: { latitude: -34.9, longitude: -56.1 } as GeolocationCoordinates,
        timestamp: Date.now(),
      } as GeolocationPosition);
    });

    expect(await screen.findByText(alert.mensaje)).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith("/api/alertas", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({
        trayectoId: "trayecto-1",
        location: { lat: -34.9, lng: -56.1 },
        radioMetros: 500,
      }),
    }));
  });
});
