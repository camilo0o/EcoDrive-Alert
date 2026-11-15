// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AlertasPanel } from "@/app/dashboard/_components/alertas-panel";

const { useAlertas } = vi.hoisted(() => ({ useAlertas: vi.fn() }));

vi.mock("@/app/dashboard/hooks/use-alertas", () => ({ useAlertas }));

describe("panel de alertas de fauna", () => {
  beforeEach(() => {
    useAlertas.mockReset();
  });

  it("muestra la especie asociada al avistamiento en su tarjeta", () => {
    const marcarComoVista = vi.fn();
    useAlertas.mockReturnValue({
      alertas: [{
        _id: "alerta-1",
        mensaje: "Precaución: avistamiento de fauna en los próximos 2 km",
        nombreAnimal: "Carpincho",
        distanciaKm: 1.2,
        visto: false,
        fechaHora: "2026-11-15T12:00:00.000Z",
      }],
      error: "",
      loading: false,
      marcarComoVista,
    });

    render(<AlertasPanel trayectoId="trayecto-1" />);

    expect(screen.getByRole("article", { name: "Avistamiento de Carpincho" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Carpincho" })).toBeVisible();
    expect(screen.getByText("Precaución: avistamiento de fauna en los próximos 2 km")).toBeVisible();
    expect(screen.getByText("Aprox. 1.2 km")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Marcar como vista" }));
    expect(marcarComoVista).toHaveBeenCalledWith("alerta-1");
  });
});
