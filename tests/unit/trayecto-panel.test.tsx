// @vitest-environment jsdom

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TrayectoPanel } from "@/app/dashboard/_components/trayecto-panel";

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
  it("inicia desde GPS y empieza a comprobar alertas automáticamente", async () => {
    const trayecto = {
      id: "trayecto-1",
      origenNombre: "Ubicación actual",
      destinoNombre: "Punta del Este",
    };
    let positionCallback: PositionCallback | undefined;
    const watchPosition = vi.fn((success: PositionCallback) => {
      positionCallback = success;
      return 7;
    });
    const clearWatch = vi.fn();
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (success: PositionCallback) => success({
          coords: { latitude: -34.9, longitude: -56.1 } as GeolocationCoordinates,
          timestamp: Date.now(),
        } as GeolocationPosition),
        watchPosition,
        clearWatch,
      },
    });

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/trayectos" && !init?.method) return jsonResponse({ trayecto: null });
      if (url === "/api/trayectos" && init?.method === "POST") return jsonResponse({ trayecto }, 201);
      if (url.startsWith("/api/alertas?")) return jsonResponse({ alertas: [] });
      if (url === "/api/alertas" && init?.method === "POST") {
        return jsonResponse({ creadas: 0, alertas: [] });
      }
      throw new Error(`Solicitud inesperada: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<TrayectoPanel />);

    fireEvent.change(await screen.findByLabelText("Destino"), {
      target: { value: "Punta del Este" },
    });
    expect(screen.queryByLabelText("Latitud del destino")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Longitud del destino")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Iniciar trayecto y alertas" }));

    expect(await screen.findByText(/Ubicación actual → Punta del Este/)).toBeVisible();
    const startRequest = fetchMock.mock.calls.find(([, options]) => options?.method === "POST");
    expect(JSON.parse(String(startRequest?.[1]?.body))).toEqual({
      origen: { lat: -34.9, lng: -56.1 },
      destinoNombre: "Punta del Este",
    });
    await waitFor(() => expect(watchPosition).toHaveBeenCalledOnce());

    const position = {
      coords: { latitude: -34.9, longitude: -56.1 } as GeolocationCoordinates,
      timestamp: Date.now(),
    } as GeolocationPosition;
    await act(async () => {
      positionCallback?.(position);
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/alertas", expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          trayectoId: "trayecto-1",
          location: { lat: -34.9, lng: -56.1 },
          radioMetros: 200,
        }),
      }));
    });
    expect(screen.getByText("Seguimiento GPS activo. No hay alertas cercanas.")).toBeVisible();
  });
});
