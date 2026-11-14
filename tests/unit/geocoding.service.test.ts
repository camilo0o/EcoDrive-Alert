import { afterEach, describe, expect, it, vi } from "vitest";
import { geocodeDestination } from "@/lib/services/geocoding.service";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("geocodeDestination", () => {
  it("busca destinos en Uruguay y devuelve las coordenadas del primer resultado", async () => {
    let requestedUrl: URL | undefined;
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      requestedUrl = new URL(String(input));
      return new Response(JSON.stringify([{
        lat: "-34.961",
        lon: "-54.952",
        display_name: "Punta del Este, Maldonado, Uruguay",
      }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(geocodeDestination("Punta del Este")).resolves.toEqual({
      lat: -34.961,
      lng: -54.952,
      nombre: "Punta del Este, Maldonado, Uruguay",
    });
    expect(requestedUrl?.searchParams.get("q")).toBe("Punta del Este");
    expect(requestedUrl?.searchParams.get("countrycodes")).toBe("uy");
    expect(requestedUrl?.searchParams.get("limit")).toBe("1");
  });

  it("devuelve null si el servicio no encuentra el lugar", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("[]", {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })));

    await expect(geocodeDestination("Lugar desconocido")).resolves.toBeNull();
  });
});
