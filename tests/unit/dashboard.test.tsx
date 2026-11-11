// @vitest-environment jsdom

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import DashboardClient, { type DashboardInitialData } from "@/app/dashboard/dashboard-client";
import { DEVICE_LOCATION_TTL_MS } from "@/app/dashboard/hooks/use-device-location";

vi.mock("@/app/dashboard/logout-button", () => ({
  default: () => <button type="button">Cerrar sesión</button>,
}));

vi.mock("@/app/dashboard/_components/map-panel", () => ({
  MapPanel: ({
    userLocation,
    onLocate,
  }: {
    userLocation: [number, number] | null;
    onLocate: () => void;
  }) => (
    <>
      <button onClick={onLocate} type="button">Mi ubicación</button>
      <div data-testid="map-user-location">{userLocation?.join(",") ?? "sin ubicación"}</div>
    </>
  ),
}));

const route = {
  id: "route-1",
  nombre: "Ruta 1",
  longitudKm: 177,
  codigoMtop: "1",
  kmsDisponibles: [42, 42.5],
};
const species = {
  id: "species-1",
  nombre: "Carpincho",
  nivelRiesgo: "ALTO",
  alias: ["Capibara"],
  inaturalistTaxonId: null,
  nombreCientifico: null,
  fotoReferencia: null,
  atribucionFoto: null,
  licenciaFoto: null,
};
const taxon = {
  id: 12345,
  nombreCientifico: "Hydrochoerus hydrochaeris",
  nombreComun: "Carpincho",
  fotoReferencia: "https://inaturalist-open-data.s3.amazonaws.com/photos/123/medium.jpg",
  atribucionFoto: "(c) Fotógrafa (CC BY)",
  licenciaFoto: "cc-by",
};
const sighting = {
  id: "sighting-1",
  especie: {
    id: species.id,
    nombre: species.nombre,
    nivelRiesgo: species.nivelRiesgo,
    nombreCientifico: null,
    inaturalistTaxonId: null,
    fotoReferencia: null,
    atribucionFoto: null,
    licenciaFoto: null,
  },
  rutaId: route.id,
  fechaHora: "2026-10-28T15:00:00.000Z",
  ubicacion: { type: "Point" as const, coordinates: [-56.2, -34.5] as [number, number] },
  km: 42,
  foto: null,
  descripcion: "Cruce cerca del arroyo",
  metodo: "MANUAL",
  confianza: null,
  esAnonimo: false,
  esPropio: true,
  estado: "ACTIVO",
};
const initialData: DashboardInitialData = {
  rutas: [route],
  rutaKmDisponible: true,
  errorRutaKm: null,
  especies: [species],
  avistamientos: [sighting],
  total: 1,
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mockDashboardFetch() {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url === "/api/rutas") {
      return jsonResponse({ rutas: [route], rutaKmDisponible: true, errorRutaKm: null });
    }
    if (url === "/api/especies") return jsonResponse({ especies: [species] });
    if (url.startsWith("/api/especies/buscar")) return jsonResponse({ taxa: [taxon] });
    if (url === `/api/avistamientos/${sighting.id}`) {
      return jsonResponse({ avistamiento: sighting });
    }
    if (url.startsWith("/api/avistamientos") && init?.method === "POST") {
      return jsonResponse({ avistamiento: sighting }, 201);
    }
    if (url.startsWith("/api/avistamientos")) {
      return jsonResponse({ avistamientos: [sighting], total: 1 });
    }
    throw new Error(`Solicitud inesperada: ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("panel de avistamientos", () => {
  it("muestra la actividad y obtiene el detalle del reporte seleccionado", async () => {
    const fetchMock = mockDashboardFetch();
    render(<DashboardClient initialData={initialData} userName="Ana" />);

    expect(screen.getByRole("heading", { name: "Carpincho" })).toBeVisible();
    expect(screen.getByText("Cruce cerca del arroyo")).toBeVisible();
    expect(screen.getByText("Ruta 1 · km 42")).toBeVisible();
    expect(screen.getAllByText("Riesgo alto")).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Ver detalle" }));

    expect(await screen.findByRole("heading", { name: "Detalle del avistamiento" })).toBeVisible();
    expect(await screen.findByText("Tu reporte")).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith(`/api/avistamientos/${sighting.id}`);
  });

  it("consulta los avistamientos al cambiar el filtro de ruta", async () => {
    const fetchMock = mockDashboardFetch();
    render(<DashboardClient initialData={initialData} userName="Ana" />);

    fireEvent.change(screen.getByRole("combobox", { name: "Filtrar por ruta" }), {
      target: { value: route.id },
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(`/api/avistamientos?limit=100&rutaId=${route.id}`);
    });
  });

  it("envía un reporte por ruta y km sin pedir ubicación GPS", async () => {
    const fetchMock = mockDashboardFetch();
    render(<DashboardClient initialData={initialData} userName="Ana" />);
    expect(screen.getByRole("heading", { name: "Carpincho" })).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: /Reportar avistamiento/ }));
    fireEvent.click(screen.getByRole("button", { name: /Formulario/ }));
    fireEvent.change(screen.getByRole("textbox", { name: /Qué animal viste/ }), {
      target: { value: "carpincho" },
    });
    fireEvent.click(await screen.findByRole("button", { name: /Carpincho/ }));
    fireEvent.change(screen.getByRole("combobox", { name: "Nivel de riesgo inicial" }), {
      target: { value: "MEDIO" },
    });
    fireEvent.click(screen.getByRole("radio", { name: /Seleccionar ruta y km/ }));
    fireEvent.change(screen.getByRole("combobox", { name: "Ruta nacional" }), {
      target: { value: route.id },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Kilómetro calibrado" }), {
      target: { value: "42" },
    });
    expect(screen.queryByRole("button", { name: /mi ubicación actual/i })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Descripción (opcional)"), {
      target: { value: "Cruce cerca del arroyo" },
    });
    fireEvent.click(screen.getByLabelText("Publicar este reporte de forma anónima"));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar avistamiento" }));

    expect(await screen.findByText("El avistamiento quedó registrado. ¡Gracias por ayudar!")).toBeVisible();
    const createCall = fetchMock.mock.calls.find(([, options]) => options?.method === "POST");
    expect(createCall).toBeDefined();
    expect(JSON.parse(String(createCall?.[1]?.body))).toEqual({
      inaturalistTaxonId: taxon.id,
      nivelRiesgo: "MEDIO",
      locationMode: "route-km",
      rutaId: route.id,
      km: 42,
      descripcion: "Cruce cerca del arroyo",
      esAnonimo: true,
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/avistamientos?"),
    ));
  });

  it("usa GPS como modalidad exclusiva y no envía el formulario al pedir ubicación", async () => {
    const fetchMock = mockDashboardFetch();
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (success: PositionCallback) => success({
          coords: { latitude: -34.5, longitude: -56.2 } as GeolocationCoordinates,
          timestamp: Date.now(),
        } as GeolocationPosition),
      },
    });
    render(<DashboardClient initialData={initialData} userName="Ana" />);

    fireEvent.click(screen.getByRole("button", { name: /Reportar avistamiento/ }));
    fireEvent.click(screen.getByRole("button", { name: /Formulario/ }));
    fireEvent.change(screen.getByRole("textbox", { name: /Qué animal viste/ }), {
      target: { value: "carpincho" },
    });
    fireEvent.click(await screen.findByRole("button", { name: /Carpincho/ }));
    fireEvent.change(screen.getByRole("combobox", { name: "Nivel de riesgo inicial" }), {
      target: { value: "BAJO" },
    });
    expect(screen.getByRole("radio", { name: /ubicación actual \(GPS\)/i })).toBeChecked();
    expect(screen.queryByRole("combobox", { name: "Ruta nacional" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Usar mi ubicación actual" }));

    await waitFor(() => expect(screen.getByText(/Ubicación lista/)).toBeVisible());
    expect(screen.queryByLabelText("Latitud")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Longitud")).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, options]) => options?.method === "POST")).toBe(false);
    expect(screen.getByTestId("map-user-location")).toHaveTextContent("sin ubicación");
    expect(screen.getByRole("textbox", { name: /Qué animal viste/ })).not.toHaveAttribute("required");
    fireEvent.click(screen.getByRole("button", { name: "Confirmar avistamiento" }));
    expect(await screen.findByText("El avistamiento quedó registrado. ¡Gracias por ayudar!")).toBeVisible();
    const createCall = fetchMock.mock.calls.find(([, options]) => options?.method === "POST");
    expect(JSON.parse(String(createCall?.[1]?.body))).toMatchObject({
      locationMode: "gps",
      coordinates: [-56.2, -34.5],
    });
    expect(JSON.parse(String(createCall?.[1]?.body))).not.toHaveProperty("rutaId");
    expect(JSON.parse(String(createCall?.[1]?.body))).not.toHaveProperty("km");
    expect(screen.getByTestId("map-user-location")).toHaveTextContent("sin ubicación");
  });

  it("no registra el avistamiento si no se obtuvo la ubicación", async () => {
    const fetchMock = mockDashboardFetch();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<DashboardClient initialData={initialData} userName="Ana" />);

    fireEvent.click(screen.getByRole("button", { name: /Reportar avistamiento/ }));
    fireEvent.click(screen.getByRole("button", { name: /Formulario/ }));
    fireEvent.change(screen.getByRole("textbox", { name: /Qué animal viste/ }), {
      target: { value: "carpincho" },
    });
    fireEvent.click(await screen.findByRole("button", { name: /Carpincho/ }));
    fireEvent.change(screen.getByRole("combobox", { name: "Nivel de riesgo inicial" }), {
      target: { value: "BAJO" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar avistamiento" }));

    expect(await screen.findByText("Obtén tu ubicación actual antes de registrar el avistamiento.")).toBeVisible();
    expect(fetchMock.mock.calls.some(([, options]) => options?.method === "POST")).toBe(false);
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("muestra la ubicación actual solo en el mapa y la elimina al expirar", async () => {
    vi.useFakeTimers();
    const fetchMock = mockDashboardFetch();
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (success: PositionCallback) => success({
          coords: { latitude: -34.5, longitude: -56.2 } as GeolocationCoordinates,
          timestamp: Date.now(),
        } as GeolocationPosition),
      },
    });
    render(<DashboardClient initialData={initialData} userName="Ana" />);

    fireEvent.click(screen.getByRole("button", { name: "Mi ubicación" }));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByTestId("map-user-location")).toHaveTextContent("-34.5,-56.2");
    expect(fetchMock.mock.calls.some(([, options]) => options?.method === "POST")).toBe(false);

    act(() => {
      vi.advanceTimersByTime(DEVICE_LOCATION_TTL_MS);
    });
    expect(screen.getByTestId("map-user-location")).toHaveTextContent("sin ubicación");
  });
});
