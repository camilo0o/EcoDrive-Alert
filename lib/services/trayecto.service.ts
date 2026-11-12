import { Types } from "mongoose";
import { EstadoTrayecto } from "@/lib/enums";
import { connectDB } from "@/lib/db/mongodb";
import TrayectoModel from "@/lib/models/Trayecto";
import type { TrayectoDatos } from "@/lib/types/trayecto";

export type CoordenadaTrayecto = {
  lat: number;
  lng: number;
};

export type IniciarTrayectoInput = {
  origen: CoordenadaTrayecto;
  destino: CoordenadaTrayecto;
  destinoNombre: string;
  distanciaKm: number;
  duracionEstimadaMin: number;
};

export type TrayectoPublico = {
  id: string;
  origenNombre: string;
  destinoNombre: string;
  origen: CoordenadaTrayecto;
  destino: CoordenadaTrayecto | null;
  distanciaKm: number | null;
  duracionEstimadaMin: number | null;
  estado: EstadoTrayecto;
};

type TrayectoDocument = TrayectoDatos & { _id: Types.ObjectId };

export class TrayectoEnCursoExistenteError extends Error {}

function aPublico(trayecto: TrayectoDocument): TrayectoPublico {
  return {
    id: String(trayecto._id),
    origenNombre: trayecto.origenNombre,
    destinoNombre: trayecto.destinoNombre,
    origen: { lat: trayecto.origenLatitud, lng: trayecto.origenLongitud },
    destino: typeof trayecto.destinoLatitud === "number" && typeof trayecto.destinoLongitud === "number"
      ? { lat: trayecto.destinoLatitud, lng: trayecto.destinoLongitud }
      : null,
    distanciaKm: trayecto.distanciaKm ?? null,
    duracionEstimadaMin: trayecto.duracionEstimadaMin ?? null,
    estado: trayecto.estado,
  };
}

export async function obtenerTrayectoEnCurso(usuarioId: string): Promise<TrayectoPublico | null> {
  await connectDB();
  const trayecto = await TrayectoModel.findOne({
    usuarioId: new Types.ObjectId(usuarioId),
    estado: EstadoTrayecto.EN_CURSO,
  }).lean<TrayectoDocument>();

  return trayecto ? aPublico(trayecto) : null;
}

export async function iniciarTrayecto(
  input: IniciarTrayectoInput,
  usuarioId: string,
): Promise<TrayectoPublico> {
  await connectDB();
  const userObjectId = new Types.ObjectId(usuarioId);

  const existente = await TrayectoModel.exists({
    usuarioId: userObjectId,
    estado: EstadoTrayecto.EN_CURSO,
  });
  if (existente) throw new TrayectoEnCursoExistenteError("Ya tienes un trayecto en curso.");

  const trayecto = await TrayectoModel.create({
    origenNombre: "Punto A",
    origenLatitud: input.origen.lat,
    origenLongitud: input.origen.lng,
    destinoNombre: input.destinoNombre,
    destinoLatitud: input.destino.lat,
    destinoLongitud: input.destino.lng,
    distanciaKm: input.distanciaKm,
    duracionEstimadaMin: input.duracionEstimadaMin,
    estado: EstadoTrayecto.EN_CURSO,
    iniciadoEn: new Date(),
    usuarioId: userObjectId,
  });

  return aPublico(trayecto);
}

export async function finalizarTrayecto(
  trayectoId: string,
  usuarioId: string,
): Promise<TrayectoPublico | null> {
  await connectDB();
  const trayecto = await TrayectoModel.findOneAndUpdate(
    {
      _id: new Types.ObjectId(trayectoId),
      usuarioId: new Types.ObjectId(usuarioId),
      estado: EstadoTrayecto.EN_CURSO,
    },
    {
      $set: {
        estado: EstadoTrayecto.FINALIZADO,
        finalizadoEn: new Date(),
      },
    },
    { returnDocument: "after" },
  ).lean<TrayectoDocument>();

  return trayecto ? aPublico(trayecto) : null;
}
