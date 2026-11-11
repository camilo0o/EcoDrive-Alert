import { connectDB } from "@/lib/db/mongodb";
import AlertaModel from "@/lib/models/Alerta";
import AvistamientoModel from "@/lib/models/Avistamiento";
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
  fechaHora: Date;
  distanciaKm: number;
  visto: boolean;
  trayectoId: string;
  avistamientoId: string;
};

const RADIO_ALERTA_METROS = 200;

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
  return {
    _id: String(alerta._id),
    mensaje: String(alerta.mensaje),
    fechaHora: alerta.fechaHora ? new Date(String(alerta.fechaHora)) : new Date(),
    distanciaKm: Number(alerta.distanciaKm ?? 0),
    visto: Boolean(alerta.visto),
    trayectoId: String(alerta.trayectoId),
    avistamientoId: String(alerta.avistamientoId),
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
    .lean<Record<string, unknown>[]>();

  return alertas.map(normalizarAlerta);
}

export async function marcarAlertaVista(alertaId: string, usuarioId: string): Promise<AlertaPublica | null> {
  await connectDB();

  const alerta = await AlertaModel.findOne({ _id: new Types.ObjectId(alertaId) })
    .populate("trayectoId", "usuarioId")
    .lean<Record<string, unknown>>();

  if (!alerta) return null;
  const trayecto = alerta.trayectoId as Record<string, unknown> | null;
  if (!trayecto || String(trayecto.usuarioId) !== usuarioId) return null;

  const actualizada = await AlertaModel.findOneAndUpdate(
    { _id: new Types.ObjectId(alertaId) },
    { $set: { visto: true } },
    { returnDocument: "after" },
  ).lean<Record<string, unknown>>();

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
    .populate("especieId", "nombre nombreComun")
    .lean<Record<string, unknown>[]>();

  const creadas: AlertaPublica[] = [];

  for (const avistamiento of avistamientosCercanos) {
    const avistamientoId = String(avistamiento._id);
    const existe = await AlertaModel.exists({
      trayectoId: new Types.ObjectId(trayectoId),
      avistamientoId: new Types.ObjectId(avistamientoId),
    });

    if (existe) continue;

    const species = (avistamiento.especieId as Record<string, unknown> | null) ?? null;
    const nombre = (species?.nombreComun as string | undefined) ?? (species?.nombre as string | undefined) ?? "fauna silvestre";

    const coords = (avistamiento.ubicacion as Record<string, unknown>)?.coordinates as [number, number] | undefined;
    const distanciaKm = coords && coords.length >= 2
      ? haversineKm(ubicacion.lat, ubicacion.lng, Number(coords[1]), Number(coords[0]))
      : Number.POSITIVE_INFINITY;

    if (distanciaKm === Number.POSITIVE_INFINITY || distanciaKm > radioMetros / 1000) continue;

    const alerta = await AlertaModel.create({
      mensaje: `Atención: hay un ${nombre} cerca de tu ruta. Distancia aproximada: ${distanciaKm.toFixed(1)} km.`,
      fechaHora: new Date(),
      distanciaKm: Number(distanciaKm.toFixed(2)),
      visto: false,
      trayectoId: new Types.ObjectId(trayectoId),
      avistamientoId: new Types.ObjectId(avistamientoId),
    });

    creadas.push(normalizarAlerta(alerta.toObject ? alerta.toObject() : alerta));
  }

  return { creadas: creadas.length, alertas: creadas };
}
