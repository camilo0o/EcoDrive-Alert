import { Types } from "mongoose";

export interface AlertaDatos {
    mensaje: string;
    fechaHora: Date;
    distanciaKm: number;
    visto: boolean;
    trayectoId: Types.ObjectId;
    avistamientoId: Types.ObjectId;
}
