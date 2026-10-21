import { Types } from "mongoose";
import { EstadoAvistamiento, MetodoReporte } from "../enums";
import { PuntoGeo } from "./punto-geo";

export interface AvistamientoDatos {
    usuarioId: Types.ObjectId;
    especieId: Types.ObjectId;
    rutaId?: Types.ObjectId;
    fechaHora: Date;
    ubicacion: PuntoGeo;
    km?: number;
    foto?: string;
    descripcion?: string;
    transcripcion?: string;
    metodo: MetodoReporte;
    confianza?: number;
    esAnonimo: boolean;
    estado: EstadoAvistamiento;
}
