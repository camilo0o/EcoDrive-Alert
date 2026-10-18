import { Types } from "mongoose";
import { EstadoTrayecto } from "../enums/estado-trayecto";

export interface TrayectoDatos{
    origen: string;
    destino: string;
    distanciaKm: number;
    duracionMinutos: number;
    estado: EstadoTrayecto;
    iniciadoEn?: Date;
    finalizadoEn?: Date;
    usuarioId: Types.ObjectId;
}