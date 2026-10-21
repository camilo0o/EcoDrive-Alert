import { Types } from "mongoose";

export interface TrayectoRutaDatos {
    trayectoId: Types.ObjectId;
    rutaId: Types.ObjectId;
    orden: number;
}