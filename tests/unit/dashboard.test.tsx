// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import DashboardClient, { type DashboardInitialData } from "@/app/dashboard/dashboard-client";

vi.mock("@/app/dashboard/logout-button", () => ({
  default: () => <button type="button">Cerrar sesión</button>,
}));

const route = { id: "route-1", nombre: "Ruta 1", longitudKm: 177 };
const species = {
  id: "species-1",
  nombre: "Carpincho",
  nivelRiesgo: "ALTO",
  alias: ["Capibara"],
};
const sighting = {
  id: "sighting-1",
  especie: { id: species.id, nombre: species.nombre, nivelRiesgo: species.nivelRiesgo },
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
    if (url === "/api/rutas") return jsonResponse({ rutas: [route] });
    if (url === "/api/especies") return jsonResponse({ especies: [species] });
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

  it("envía un reporte manual y presenta la confirmación", async () => {
    const fetchMock = mockDashboardFetch();
    render(<DashboardClient initialData={initialData} userName="Ana" />);
    expect(screen.getByRole("heading", { name: "Carpincho" })).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: /Reportar avistamiento/ }));
    fireEvent.change(screen.getByRole("combobox", { name: /Qué animal viste/ }), {
      target: { value: species.id },
    });
    fireEvent.change(screen.getByRole("combobox", { name: "Ruta" }), {
      target: { value: route.id },
    });
    fireEvent.change(screen.getByLabelText("Kilómetro"), { target: { value: "42" } });
    fireEvent.change(screen.getByLabelText("Longitud"), { target: { value: "-56.2" } });
    fireEvent.change(screen.getByLabelText("Latitud"), { target: { value: "-34.5" } });
    fireEvent.change(screen.getByLabelText("Descripción (opcional)"), {
      target: { value: "Cruce cerca del arroyo" },
    });
    fireEvent.click(screen.getByLabelText("Publicar este reporte de forma anónima"));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar avistamiento" }));

    expect(await screen.findByText("El avistamiento quedó registrado. ¡Gracias por ayudar!")).toBeVisible();
    const createCall = fetchMock.mock.calls.find(([, options]) => options?.method === "POST");
    expect(createCall).toBeDefined();
    expect(JSON.parse(String(createCall?.[1]?.body))).toEqual({
      especieId: species.id,
      rutaId: route.id,
      km: 42,
      coordinates: [-56.2, -34.5],
      descripcion: "Cruce cerca del arroyo",
      esAnonimo: true,
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/avistamientos?"),
    ));
  });
});
