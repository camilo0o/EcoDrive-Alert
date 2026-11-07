// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";
import { buscarTaxonesINaturalist, INaturalistApiError } from "@/lib/services/inaturalist.service";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("buscarTaxonesINaturalist", () => {
  it("consulta solo especies y conserva los datos de fotos con licencia explícita", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      results: [
        {
          id: 123,
          rank: "species",
          name: "Hydrochoerus hydrochaeris",
          preferred_common_name: "Carpincho",
          default_photo: {
            medium_url: "https://inaturalist-open-data.s3.amazonaws.com/photos/123/medium.jpg",
            attribution: "(c) Fotógrafa (CC BY)",
            license_code: "cc-by",
          },
        },
        {
          id: 456,
          rank: "species",
          name: "Another species",
          default_photo: {
            medium_url: "https://inaturalist-open-data.s3.amazonaws.com/photos/456/medium.jpg",
            attribution: "(c) Fotógrafo",
            license_code: null,
          },
        },
      ],
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const taxa = await buscarTaxonesINaturalist("carpincho");

    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.searchParams.get("q")).toBe("carpincho");
    expect(url.searchParams.get("rank")).toBe("species");
    expect(taxa).toEqual([
      {
        id: 123,
        nombreCientifico: "Hydrochoerus hydrochaeris",
        nombreComun: "Carpincho",
        fotoReferencia: "https://inaturalist-open-data.s3.amazonaws.com/photos/123/medium.jpg",
        atribucionFoto: "(c) Fotógrafa (CC BY)",
        licenciaFoto: "cc-by",
      },
      {
        id: 456,
        nombreCientifico: "Another species",
        fotoReferencia: undefined,
        atribucionFoto: "(c) Fotógrafo",
        licenciaFoto: undefined,
      },
    ]);
  });

  it("expone errores del proveedor cuando iNaturalist no responde correctamente", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 503 })));

    await expect(buscarTaxonesINaturalist("carpincho")).rejects.toBeInstanceOf(INaturalistApiError);
  });
});
