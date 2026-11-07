import { z } from "zod";

const INATURALIST_API = "https://api.inaturalist.org/v1";

const photoSchema = z.object({
    medium_url: z.string().url().nullable().optional(),
    attribution: z.string().nullable().optional(),
    license_code: z.string().nullable().optional(),
}).nullable().optional();

const taxonSchema = z.object({
    id: z.number().int().positive(),
    rank: z.string().min(1),
    name: z.string().min(1),
    preferred_common_name: z.string().nullable().optional(),
    default_photo: photoSchema,
});

const taxaResponseSchema = z.object({
    results: z.array(taxonSchema),
});

const photoLicenses = new Set([
    "cc0",
    "cc-by",
    "cc-by-sa",
    "cc-by-nc",
    "cc-by-nc-sa",
    "cc-by-nd",
    "cc-by-nc-nd",
]);

export type TaxonDeINaturalist = {
    id: number;
    nombreCientifico: string;
    nombreComun?: string;
    fotoReferencia?: string;
    atribucionFoto?: string;
    licenciaFoto?: string;
};

export class INaturalistApiError extends Error { }

async function consultar<T>(url: URL, schema: z.ZodType<T>): Promise<T> {
    let response: Response;
    try {
        response = await fetch(url, {
            headers: { "User-Agent": "EcoDriveAlert/0.1" },
            signal: AbortSignal.timeout(8_000),
            cache: "no-store",
        });
    } catch (error) {
        throw new INaturalistApiError("No se pudo conectar con iNaturalist.", { cause: error });
    }

    if (!response.ok) {
        throw new INaturalistApiError(`iNaturalist respondió con el estado ${response.status}.`);
    }

    let body: unknown;
    try {
        body = await response.json();
    } catch (error) {
        throw new INaturalistApiError("iNaturalist devolvió una respuesta inválida.", { cause: error });
    }

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
        throw new INaturalistApiError("La respuesta de iNaturalist no tiene el formato esperado.", { cause: parsed.error });
    }
    return parsed.data;
}

function mapTaxon(taxon: z.infer<typeof taxonSchema>): TaxonDeINaturalist {
    const photo = taxon.default_photo;
    return {
        id: taxon.id,
        nombreCientifico: taxon.name,
        nombreComun: taxon.preferred_common_name || undefined,
        fotoReferencia: photo?.license_code && photoLicenses.has(photo.license_code)
            ? photo.medium_url || undefined
            : undefined,
        atribucionFoto: photo?.attribution || undefined,
        licenciaFoto: photo?.license_code || undefined,
    };
}

export async function buscarTaxonesINaturalist(query: string): Promise<TaxonDeINaturalist[]> {
    const url = new URL(`${INATURALIST_API}/taxa/autocomplete`);
    url.searchParams.set("q", query);
    url.searchParams.set("per_page", "8");
    url.searchParams.set("locale", "es");
    url.searchParams.set("rank", "species");

    const result = await consultar(url, taxaResponseSchema);
    return result.results
        .filter((taxon) => taxon.rank === "species")
        .map(mapTaxon);
}

export async function obtenerTaxonINaturalist(id: number): Promise<TaxonDeINaturalist> {
    const url = new URL(`${INATURALIST_API}/taxa/${id}`);
    url.searchParams.set("locale", "es");
    const result = await consultar(url, taxaResponseSchema);
    const taxon = result.results.find((item) => item.id === id);
    if (!taxon) {
        throw new INaturalistApiError("iNaturalist no encontró el taxón seleccionado.");
    }
    if (taxon.rank !== "species") {
        throw new INaturalistApiError("El taxón seleccionado no corresponde a una especie.");
    }
    return mapTaxon(taxon);
}
