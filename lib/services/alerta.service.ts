import { connectDB } from "@/lib/db/mongodb";
import AlertaModel from "@/lib/models/Alerta";
import AvistamientoModel from "@/lib/models/Avistamiento";
import EspecieModel from "@/lib/models/Especie";
import TrayectoModel from "@/lib/models/Trayecto";
import { EstadoAvistamiento, EstadoTrayecto } from "@/lib/enums";
import { Types } from "mongoose";

export type PuntoGps = {
  lat: number;
  lng: number;
};

export type AlertaPublica = {
  _id: string;
  mensaje: string;
  nombreAnimal: string | null;
  fechaHora: Date;
  distanciaKm: number;
  visto: boolean;
  trayectoId: string;
  avistamientoId: string;
};

function nombreAnimalDeAvistamiento(avistamiento: unknown): string | null {
  if (!avistamiento || typeof avistamiento !== "object") return null;

  const especieId = (avistamiento as Record<string, unknown>).especieId;
  if (!especieId || typeof especieId !== "object") return null;

  const especie = especieId as Record<string, unknown>;
  if (typeof especie.nombreComun === "string" && especie.nombreComun.trim()) {
    return especie.nombreComun;
  }
  return typeof especie.nombre === "string" && especie.nombre.trim() ? especie.nombre : null;
}

function populateAvistamiento() {
  return {
    path: "avistamientoId",
    select: "especieId",
    model: AvistamientoModel,
    populate: { path: "especieId", select: "nombre nombreComun", model: EspecieModel },
  };
}

function idDeReferencia(referencia: unknown): string {
  if (referencia && typeof referencia === "object" && "_id" in referencia) {
    const id = (referencia as Record<string, unknown>)._id;
    if (id !== undefined && id !== referencia) return String(id);
  }
  return String(referencia);
}

const RADIO_ALERTA_METROS = 2000;

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function normalizarAlerta(alerta: Record<string, unknown>): AlertaPublica {
  const avistamiento = alerta.avistamientoId;

  return {
    _id: String(alerta._id),
    mensaje: String(alerta.mensaje),
    nombreAnimal: typeof alerta.nombreAnimal === "string"
      ? alerta.nombreAnimal
      : nombreAnimalDeAvistamiento(avistamiento),
    fechaHora: alerta.fechaHora ? new Date(String(alerta.fechaHora)) : new Date(),
    distanciaKm: Number(alerta.distanciaKm ?? 0),
    visto: Boolean(alerta.visto),
    trayectoId: idDeReferencia(alerta.trayectoId),
    avistamientoId: idDeReferencia(avistamiento),
  };
}

async function trayectoPerteneceAlUsuario(trayectoId: string, usuarioId: string) {
  await connectDB();
  return !!(await TrayectoModel.exists({
    _id: new Types.ObjectId(trayectoId),
    usuarioId: new Types.ObjectId(usuarioId),
  }));
}

export async function listarAlertasPorTrayecto(trayectoId: string, usuarioId: string): Promise<AlertaPublica[]> {
  await connectDB();

  if (!(await trayectoPerteneceAlUsuario(trayectoId, usuarioId))) {
    return [];
  }

  const alertas = await AlertaModel.find({
    trayectoId: new Types.ObjectId(trayectoId),
    visto: false,
  })
    .sort({ fechaHora: -1 })
    .populate(populateAvistamiento())
    .lean<Record<string, unknown>[]>();

  return alertas.map(normalizarAlerta);
}

export async function marcarAlertaVista(alertaId: string, usuarioId: string): Promise<AlertaPublica | null> {
  await connectDB();

  const alerta = await AlertaModel.findOne({ _id: new Types.ObjectId(alertaId) })
    .populate("trayectoId", "usuarioId")
    .populate(populateAvistamiento())
    .lean<Record<string, unknown>>();

  if (!alerta) return null;
  const trayecto = alerta.trayectoId as Record<string, unknown> | null;
  if (!trayecto || String(trayecto.usuarioId) !== usuarioId) return null;

  const actualizada = await AlertaModel.findOneAndUpdate(
    { _id: new Types.ObjectId(alertaId) },
    { $set: { visto: true } },
    { returnDocument: "after" },
  )
    .populate(populateAvistamiento())
    .lean<Record<string, unknown>>();

  return actualizada ? normalizarAlerta(actualizada) : null;
}

export async function revisarAlertasParaUbicacion(
  trayectoId: string,
  usuarioId: string,
  ubicacion: PuntoGps,
  radioMetros = RADIO_ALERTA_METROS,
) {
  await connectDB();

  const trayecto = await TrayectoModel.findOne({
    _id: new Types.ObjectId(trayectoId),
    usuarioId: new Types.ObjectId(usuarioId),
    estado: EstadoTrayecto.EN_CURSO,
  }).lean<Record<string, unknown>>();

  if (!trayecto) {
    return { creadas: 0, alertas: [] as AlertaPublica[] };
  }

  const avistamientosCercanos = await AvistamientoModel.find({
    estado: EstadoAvistamiento.ACTIVO,
    ubicacion: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [ubicacion.lng, ubicacion.lat],
        },
        $maxDistance: radioMetros,
      },
    },
  })
    .populate("especieId", "nombre nombreComun", EspecieModel)
    .lean<Record<string, unknown>[]>();

  const creadas: AlertaPublica[] = [];

  for (const avistamiento of avistamientosCercanos) {
    const avistamientoId = String(avistamiento._id);
    const existe = await AlertaModel.exists({
      trayectoId: new Types.ObjectId(trayectoId),
      avistamientoId: new Types.ObjectId(avistamientoId),
    });

    if (existe) continue;

    const coords = (avistamiento.ubicacion as Record<string, unknown>)?.coordinates as [number, number] | undefined;
    const distanciaKm = coords && coords.length >= 2
      ? haversineKm(ubicacion.lat, ubicacion.lng, Number(coords[1]), Number(coords[0]))
      : Number.POSITIVE_INFINITY;

    if (distanciaKm === Number.POSITIVE_INFINITY || distanciaKm > radioMetros / 1000) continue;

    const alerta = await AlertaModel.create({
      mensaje: "Precaución: avistamiento de fauna en los próximos 2 km",
      fechaHora: new Date(),
      distanciaKm: Number(distanciaKm.toFixed(2)),
      visto: false,
      trayectoId: new Types.ObjectId(trayectoId),
      avistamientoId: new Types.ObjectId(avistamientoId),
    });

    creadas.push(normalizarAlerta({
      ...(alerta.toObject ? alerta.toObject() : alerta),
      nombreAnimal: nombreAnimalDeAvistamiento(avistamiento),
    }));
  }

  return { creadas: creadas.length, alertas: creadas };
}
