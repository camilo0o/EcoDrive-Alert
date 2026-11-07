const WFS_URL = "https://geoservicios.mtop.gub.uy/geoserver/rutas_SD/ows";
const ROUTE_LAYER = "rutas_SD:uylcami1g_sd";
const MILESTONE_LAYER = "rutas_SD:mojones_sd";
const CACHE_SECONDS = 86_400;
const MAX_SNAP_DISTANCE_METERS = 100;

type MtopFeature = {
    geometry: {
        type?: string;
        coordinates?: unknown;
    } | null;
    properties: Record<string, unknown>;
};

type MtopFeatureCollection = { features: MtopFeature[] };

export type RutaMtop = {
    codigo: string;
    nombre: string;
    longitudKm: number;
    kmsDisponibles: number[];
};

type Coordinate = [longitude: number, latitude: number];

export class MtopRutaApiError extends Error { }

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseFeatureCollection(value: unknown): MtopFeatureCollection {
    if (!isRecord(value) || !Array.isArray(value.features)) {
        throw new MtopRutaApiError("El servicio del MTOP devolvió una respuesta inválida.");
    }

    const features = value.features.flatMap((feature): MtopFeature[] => {
        if (!isRecord(feature) || !isRecord(feature.properties)) return [];
        const geometry = isRecord(feature.geometry)
            ? {
                type: typeof feature.geometry.type === "string" ? feature.geometry.type : undefined,
                coordinates: feature.geometry.coordinates,
            }
            : null;
        return [{ geometry, properties: feature.properties }];
    });

    return { features };
}

async function fetchFeatures(
    layer: string,
    propertyName: string,
    routeCode?: string,
): Promise<MtopFeatureCollection> {
    const params = new URLSearchParams({
        service: "WFS",
        version: "2.0.0",
        request: "GetFeature",
        typeNames: layer,
        outputFormat: "application/json",
        propertyName,
    });
    if (routeCode) params.set("CQL_FILTER", `nom_sd='${routeCode}'`);

    const response = await fetch(`${WFS_URL}?${params.toString()}`, {
        headers: { Accept: "application/json" },
        next: { revalidate: CACHE_SECONDS },
    });
    if (!response.ok) {
        throw new MtopRutaApiError(`El geoservicio del MTOP respondió con estado ${response.status}.`);
    }

    return parseFeatureCollection(await response.json());
}

function routeCode(feature: MtopFeature) {
    const value = feature.properties.nom_sd;
    return typeof value === "string" && /^\d+$/.test(value) ? value : null;
}

export async function listarRutasMtop(): Promise<RutaMtop[]> {
    const [routeFeatures, milestoneFeatures] = await Promise.all([
        fetchFeatures(ROUTE_LAYER, "nom_sd,nombre"),
        fetchFeatures(MILESTONE_LAYER, "nom_sd,progresiva"),
    ]);

    const routeNames = new Map<string, string>();
    for (const feature of routeFeatures.features) {
        const code = routeCode(feature);
        const name = feature.properties.nombre;
        if (code) {
            const nameText = typeof name === "string" ? name.trim() : "";
            if (!routeNames.has(code) || (!routeNames.get(code) && nameText)) {
                routeNames.set(code, nameText);
            }
        }
    }

    const mileposts = new Map<string, Set<number>>();
    for (const feature of milestoneFeatures.features) {
        const code = routeCode(feature);
        const kilometer = Number(feature.properties.progresiva);
        if (!code || !Number.isFinite(kilometer) || kilometer < 0) continue;
        const values = mileposts.get(code) ?? new Set<number>();
        values.add(kilometer);
        mileposts.set(code, values);
    }

    const routes = [...routeNames.entries()].flatMap(([code, name]) => {
        const kmsDisponibles = [...(mileposts.get(code) ?? [])].sort((a, b) => a - b);
        if (kmsDisponibles.length === 0) return [];
        return [{
            codigo: code,
            nombre: name ? `Ruta ${code} — ${name}` : `Ruta ${code}`,
            longitudKm: kmsDisponibles[kmsDisponibles.length - 1],
            kmsDisponibles,
        }];
    }).sort((a, b) => Number(a.codigo) - Number(b.codigo));

    if (routes.length === 0) {
        throw new MtopRutaApiError("El geoservicio del MTOP no devolvió rutas con progresivas disponibles.");
    }
    return routes;
}

function parseCoordinate(value: unknown): Coordinate | null {
    if (!Array.isArray(value) || value.length < 2) return null;
    const [longitude, latitude] = value;
    if (
        typeof longitude !== "number" ||
        typeof latitude !== "number" ||
        !Number.isFinite(longitude) ||
        !Number.isFinite(latitude) ||
        longitude < -180 ||
        longitude > 180 ||
        latitude < -90 ||
        latitude > 90
    ) {
        return null;
    }
    return [longitude, latitude];
}

function parseRouteLines(features: MtopFeature[]): Coordinate[][] {
    const lines: Coordinate[][] = [];
    for (const feature of features) {
        const geometry = feature.geometry;
        if (!geometry || !Array.isArray(geometry.coordinates)) continue;
        const segments = geometry.type === "LineString"
            ? [geometry.coordinates]
            : geometry.type === "MultiLineString"
                ? geometry.coordinates
                : [];
        for (const segment of segments) {
            if (!Array.isArray(segment)) continue;
            const line = segment.map(parseCoordinate);
            if (line.length >= 2 && line.every((point) => point !== null)) {
                lines.push(line as Coordinate[]);
            }
        }
    }
    return lines;
}

function snapToRoute(point: Coordinate, lines: Coordinate[][]) {
    const xScale = 111_320 * Math.cos((point[1] * Math.PI) / 180);
    const yScale = 111_320;
    const px = point[0] * xScale;
    const py = point[1] * yScale;
    let nearest: { distance: number; coordinate: Coordinate } | null = null;

    for (const line of lines) {
        for (let index = 1; index < line.length; index += 1) {
            const start = line[index - 1];
            const end = line[index];
            const ax = start[0] * xScale;
            const ay = start[1] * yScale;
            const dx = end[0] * xScale - ax;
            const dy = end[1] * yScale - ay;
            const lengthSquared = dx * dx + dy * dy;
            const ratio = lengthSquared === 0
                ? 0
                : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
            const x = ax + ratio * dx;
            const y = ay + ratio * dy;
            const distance = Math.hypot(px - x, py - y);
            if (!nearest || distance < nearest.distance) {
                nearest = {
                    distance,
                    coordinate: [x / xScale, y / yScale],
                };
            }
        }
    }

    return nearest;
}

export async function obtenerCoordenadaRutaKm(codigo: string, kilometer: number): Promise<Coordinate> {
    if (!/^\d+$/.test(codigo)) {
        throw new MtopRutaApiError("La ruta seleccionada no tiene un código oficial válido.");
    }

    const [routeFeatures, milestoneFeatures] = await Promise.all([
        fetchFeatures(ROUTE_LAYER, "geom,nom_sd", codigo),
        fetchFeatures(MILESTONE_LAYER, "geom,nom_sd,progresiva", codigo),
    ]);
    const lines = parseRouteLines(routeFeatures.features);
    if (lines.length === 0) {
        throw new MtopRutaApiError(`El MTOP no tiene trazado disponible para la Ruta ${codigo}.`);
    }

    const candidates = milestoneFeatures.features
        .filter((feature) => Math.abs(Number(feature.properties.progresiva) - kilometer) <= 0.0005)
        .map((feature) => parseCoordinate(feature.geometry?.coordinates))
        .filter((coordinate): coordinate is Coordinate => coordinate !== null);
    if (candidates.length === 0) {
        throw new MtopRutaApiError(`El km ${kilometer} no tiene un punto de calibración en la Ruta ${codigo}.`);
    }

    const snapped = candidates
        .map((candidate) => snapToRoute(candidate, lines))
        .filter((result): result is NonNullable<typeof result> => result !== null)
        .sort((a, b) => a.distance - b.distance)[0];

    if (!snapped || snapped.distance > MAX_SNAP_DISTANCE_METERS) {
        throw new MtopRutaApiError(`No se pudo ubicar el km ${kilometer} sobre el trazado oficial de la Ruta ${codigo}.`);
    }

    return snapped.coordinate;
}
