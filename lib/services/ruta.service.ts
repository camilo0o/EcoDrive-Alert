import { connectDB } from "../db/mongodb";
import RutaModel from "../models/Ruta";
import type { RutaDatos } from "../types/ruta";
import { listarRutasMtop, type RutaMtop } from "./mtop-rutas.service";

export type RutaPublica = {
    id: string;
    nombre: string;
    longitudKm: number;
    codigoMtop?: string;
    kmsDisponibles?: number[];
};

export type ResultadoRutas = {
    rutas: RutaPublica[];
    rutaKmDisponible: boolean;
    errorRutaKm: string | null;
};

let sincronizacionEnCurso: Promise<void> | null = null;

async function sincronizarRutas(rutas: RutaMtop[]) {
    if (sincronizacionEnCurso) return sincronizacionEnCurso;

    sincronizacionEnCurso = (async () => {
        const existentes = await RutaModel.find({ codigoMtop: { $exists: false } })
            .select("_id nombre")
            .lean();
        const rutasLegacyPorNombre = new Map(
            existentes.map((ruta) => [ruta.nombre.trim().toLowerCase(), ruta]),
        );

        await RutaModel.bulkWrite(rutas.map((ruta) => {
            const rutaLegacy = rutasLegacyPorNombre.get(`ruta ${ruta.codigo}`.toLowerCase());
            return {
                updateOne: {
                    filter: rutaLegacy ? { _id: rutaLegacy._id } : { codigoMtop: ruta.codigo },
                    update: {
                        $set: {
                            nombre: ruta.nombre,
                            longitudKm: ruta.longitudKm,
                            codigoMtop: ruta.codigo,
                        },
                    },
                    upsert: !rutaLegacy,
                },
            };
        }));
    })();

    try {
        await sincronizacionEnCurso;
    } finally {
        sincronizacionEnCurso = null;
    }
}

function aRutasPublicas(
    documents: (RutaDatos & { _id: unknown })[],
    rutasMtop: RutaMtop[] = [],
): RutaPublica[] {
    const kilometrosPorCodigo = new Map(rutasMtop.map((ruta) => [ruta.codigo, ruta.kmsDisponibles]));
    return documents.map((ruta) => ({
        id: String(ruta._id),
        nombre: ruta.nombre,
        longitudKm: ruta.longitudKm,
        ...(ruta.codigoMtop
            ? {
                codigoMtop: ruta.codigoMtop,
                kmsDisponibles: kilometrosPorCodigo.get(ruta.codigoMtop) ?? [],
            }
            : {}),
    }));
}

export async function listarRutas(): Promise<ResultadoRutas> {
    await connectDB();

    const rutasExistentes = await RutaModel.find().sort({ nombre: 1 }).lean();

    try {
        const rutasMtop = await listarRutasMtop();
        await sincronizarRutas(rutasMtop);
        const rutasActualizadas = await RutaModel.find().sort({ nombre: 1 }).lean();
        return {
            rutas: aRutasPublicas(rutasActualizadas, rutasMtop),
            rutaKmDisponible: true,
            errorRutaKm: null,
        };
    } catch (error) {
        console.error("Error sincronizando las rutas oficiales del MTOP:", error);
        return {
            rutas: aRutasPublicas(rutasExistentes),
            rutaKmDisponible: false,
            errorRutaKm: "No se pudieron cargar las rutas y kilómetros oficiales del MTOP. Puedes reportar usando GPS.",
        };
    }
}