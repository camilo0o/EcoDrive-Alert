import { Types } from "mongoose";
import { EstadoTrayecto } from "../enums/estado-trayecto";

export interface TrayectoDatos{
    origenNombre: string;
    origenLatitud: number;
    origenLongitud: number;
    destinoNombre: string;
    destinoLatitud: number;
    destinoLongitud: number;
    distanciaKm: number;
    duracionEstimadaMin: number;
    estado: EstadoTrayecto;
    creadoEn?: Date;
    iniciadoEn?: Date;
    finalizadoEn?: Date;
    usuarioId: Types.ObjectId;
}