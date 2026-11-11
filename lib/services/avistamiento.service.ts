import { connectDB } from "../db/mongodb";
import AvistamientoModel from "../models/Avistamiento";
import EspecieModel from "../models/Especie";
import RutaModel from "../models/Ruta";
import { EstadoAvistamiento, MetodoReporte, NivelRiesgo } from "../enums";
import type { PuntoGeo } from "../types/punto-geo";
import { obtenerTaxonINaturalist } from "./inaturalist.service";
import { obtenerOCrearEspecieDesdeTaxon } from "./especie.service";
import { obtenerCoordenadaRutaKm } from "./mtop-rutas.service";

export class AvistamientoInvalidoError extends Error { }
export class AvistamientoDuplicadoError extends Error { }

/** Mismo usuario + misma especie dentro de esta ventana y radio = reporte duplicado. */
export const VENTANA_DUPLICADO_MS = 2 * 60 * 1000;
export const RADIO_DUPLICADO_METROS = 200;
const RADIO_TIERRA_METROS = 6_378_100;

export type FiltroAvistamientos = {
    estado: EstadoAvistamiento;
    rutaId?: string;
    especieId?: string;
    limit: number;
    page: number;
};

export type AvistamientoPublico = {
    id: string;
    especie: {
        id: string;
        nombre: string;
        nivelRiesgo: string;
        nombreCientifico: string | null;
        inaturalistTaxonId: number | null;
        fotoReferencia: string | null;
        atribucionFoto: string | null;
        licenciaFoto: string | null;
    } | null;
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

type NuevoAvistamientoDetalles = {
    especieId?: string;
    inaturalistTaxonId?: number;
    nivelRiesgo?: NivelRiesgo;
    descripcion?: string;
    esAnonimo: boolean;
    metodo?: MetodoReporte.MANUAL | MetodoReporte.AUDIO;
    transcripcion?: string;
};

export type NuevoAvistamiento = NuevoAvistamientoDetalles & (
    | { locationMode: "gps"; coordinates: [number, number] }
    | { locationMode: "route-km"; rutaId: string; km: number }
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function aPublico(doc: any, userId: string): AvistamientoPublico {
    const especie = doc.especieId && typeof doc.especieId === "object" && "nombre" in doc.especieId
        ? {
            id: String(doc.especieId._id),
            nombre: (doc.especieId.nombreComun as string | undefined) || doc.especieId.nombre as string,
            nivelRiesgo: doc.especieId.nivelRiesgo as string,
            nombreCientifico: (doc.especieId.nombreCientifico as string | undefined) ?? null,
            inaturalistTaxonId: (doc.especieId.inaturalistTaxonId as number | undefined) ?? null,
            fotoReferencia: (doc.especieId.fotoReferencia as string | undefined) ?? null,
            atribucionFoto: (doc.especieId.atribucionFoto as string | undefined) ?? null,
            licenciaFoto: (doc.especieId.licenciaFoto as string | undefined) ?? null,
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
            .populate("especieId", "nombre nombreComun nivelRiesgo nombreCientifico inaturalistTaxonId fotoReferencia atribucionFoto licenciaFoto")
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
        .populate("especieId", "nombre nombreComun nivelRiesgo nombreCientifico inaturalistTaxonId fotoReferencia atribucionFoto licenciaFoto")
        .lean();

    return doc ? aPublico(doc, userId) : null;
}

export async function crearAvistamiento(
    input: NuevoAvistamiento,
    userId: string,
): Promise<AvistamientoPublico | null> {
    await connectDB();

    let rutaId: string | undefined;
    let km: number | undefined;
    let coordinates: [number, number];

    if (input.locationMode === "gps") {
        coordinates = input.coordinates;
    } else {
        const ruta = await RutaModel.findById(input.rutaId)
            .select("longitudKm codigoMtop")
            .lean<{ longitudKm: number; codigoMtop?: string }>();
        if (!ruta) return null;
        if (input.km > ruta.longitudKm) {
            throw new AvistamientoInvalidoError(
                `El km no puede superar el largo de la ruta (${ruta.longitudKm} km).`,
            );
        }
        if (!ruta.codigoMtop) {
            throw new AvistamientoInvalidoError("La ruta seleccionada no tiene un trazado oficial disponible.");
        }
        coordinates = await obtenerCoordenadaRutaKm(ruta.codigoMtop, input.km);
        rutaId = input.rutaId;
        km = input.km;
    }

    let especieId = input.especieId;
    if (input.inaturalistTaxonId) {
        if (!input.nivelRiesgo) {
            throw new AvistamientoInvalidoError("Indica el nivel de riesgo inicial de la especie.");
        }
        especieId = String((await obtenerOCrearEspecieDesdeTaxon(
            await obtenerTaxonINaturalist(input.inaturalistTaxonId),
            input.nivelRiesgo,
        ))._id);
    }

    if (!especieId || !(await EspecieModel.exists({ _id: especieId }))) return null;

    const ubicacion: PuntoGeo = { type: "Point", coordinates };
    const doc = await AvistamientoModel.create({
        usuarioId: userId,
        especieId,
        rutaId,
        km,
        ubicacion,
        descripcion: input.descripcion,
        transcripcion: input.transcripcion,
        metodo: input.metodo ?? MetodoReporte.MANUAL,
        esAnonimo: input.esAnonimo,
        estado: EstadoAvistamiento.ACTIVO,
    });

    // Anti-duplicados "insertar y verificar": si dos POST llegan a la vez, los dos se insertan,
    // pero solo sobrevive el más viejo (_id menor). Un "buscar antes de insertar" no alcanza,
    // porque los dos buscarían al mismo tiempo, no verían nada y se guardarían ambos.
    const anterior = await AvistamientoModel.exists({
        _id: { $lt: doc._id },
        usuarioId: userId,
        especieId,
        fechaHora: { $gte: new Date(Date.now() - VENTANA_DUPLICADO_MS) },
        ubicacion: {
            $geoWithin: { $centerSphere: [coordinates, RADIO_DUPLICADO_METROS / RADIO_TIERRA_METROS] },
        },
    });
    if (anterior) {
        await doc.deleteOne();
        throw new AvistamientoDuplicadoError("Ya reportaste este animal en esta zona hace un momento.");
    }

    await doc.populate("especieId", "nombre nombreComun nivelRiesgo nombreCientifico inaturalistTaxonId fotoReferencia atribucionFoto licenciaFoto");

    return aPublico(doc, userId);
}