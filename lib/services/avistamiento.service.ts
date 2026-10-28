import { connectDB } from "../db/mongodb";
import AvistamientoModel from "../models/Avistamiento";
import EspecieModel from "../models/Especie";
import RutaModel from "../models/Ruta";
import { EstadoAvistamiento, MetodoReporte } from "../enums";
import type { PuntoGeo } from "../types/punto-geo";

export type FiltroAvistamientos = {
    estado: EstadoAvistamiento;
    rutaId?: string;
    especieId?: string;
    limit: number;
    page: number;
};

export type AvistamientoPublico = {
    id: string;
    especie: { id: string; nombre: string; nivelRiesgo: string } | null;
    rutaId: string | null;
    fechaHora: Date;
    /** [longitud, latitud] (GeoJSON) */
    ubicacion: { type: "Point"; coordinates: [number, number] };
    km: number | null;
    foto: string | null;
    descripcion: string | null;
    metodo: string;
    confianza: number | null;
    esAnonimo: boolean;
    /** true si el avistamiento lo reportó el usuario que consulta. */
    esPropio: boolean;
    estado: string;
};

export type NuevoAvistamiento = {
    especieId: string;
    rutaId?: string;
    km?: number;
    coordinates: [number, number];
    descripcion?: string;
    esAnonimo: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function aPublico(doc: any, userId: string): AvistamientoPublico {
    const especie = doc.especieId && typeof doc.especieId === "object" && "nombre" in doc.especieId
        ? {
              id: String(doc.especieId._id),
              nombre: doc.especieId.nombre as string,
              nivelRiesgo: doc.especieId.nivelRiesgo as string,
          }
        : null;

    return {
        id: String(doc._id),
        especie,
        rutaId: doc.rutaId ? String(doc.rutaId) : null,
        fechaHora: doc.fechaHora,
        ubicacion: doc.ubicacion,
        km: doc.km ?? null,
        foto: doc.foto ?? null,
        descripcion: doc.descripcion ?? null,
        metodo: doc.metodo,
        confianza: doc.confianza ?? null,
        esAnonimo: doc.esAnonimo,
        // Nunca se expone usuarioId: ni en reportes anónimos ni en los demás.
        esPropio: String(doc.usuarioId) === userId,
        estado: doc.estado,
    };
}

export async function listarAvistamientos(
    filtro: FiltroAvistamientos,
    userId: string,
): Promise<{ items: AvistamientoPublico[]; total: number }> {
    await connectDB();

    const query: Record<string, unknown> = { estado: filtro.estado };
    if (filtro.rutaId) query.rutaId = filtro.rutaId;
    if (filtro.especieId) query.especieId = filtro.especieId;

    const [docs, total] = await Promise.all([
        AvistamientoModel.find(query)
            .sort({ fechaHora: -1 })
            .skip((filtro.page - 1) * filtro.limit)
            .limit(filtro.limit)
            .populate("especieId", "nombre nivelRiesgo")
            .lean(),
        AvistamientoModel.countDocuments(query),
    ]);

    return { items: docs.map((d) => aPublico(d, userId)), total };
}

export async function obtenerAvistamiento(
    id: string,
    userId: string,
): Promise<AvistamientoPublico | null> {
    await connectDB();

    const doc = await AvistamientoModel.findById(id)
        .populate("especieId", "nombre nivelRiesgo")
        .lean();

    return doc ? aPublico(doc, userId) : null;
}

export async function crearAvistamiento(
    input: NuevoAvistamiento,
    userId: string,
): Promise<AvistamientoPublico | null> {
    await connectDB();

    const [especie, ruta] = await Promise.all([
        EspecieModel.exists({ _id: input.especieId }),
        input.rutaId ? RutaModel.exists({ _id: input.rutaId }) : Promise.resolve(true),
    ]);
    if (!especie || !ruta) return null;

    const ubicacion: PuntoGeo = { type: "Point", coordinates: input.coordinates };
    const doc = await AvistamientoModel.create({
        usuarioId: userId,
        especieId: input.especieId,
        rutaId: input.rutaId,
        km: input.km,
        ubicacion,
        descripcion: input.descripcion,
        metodo: MetodoReporte.MANUAL,
        esAnonimo: input.esAnonimo,
        estado: EstadoAvistamiento.ACTIVO,
    });
    await doc.populate("especieId", "nombre nivelRiesgo");

    return aPublico(doc, userId);
}