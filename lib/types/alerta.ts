import { Types } from "mongoose";

export interface AlertaDatos {
    mensaje: String;
    fechaHora: Date;
    distancia: String;
    visto: boolean;
    trayectoId: Types.ObjectId;
}