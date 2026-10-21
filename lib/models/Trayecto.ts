import { model, models, Schema } from "mongoose";
import { TrayectoDatos } from "../types/trayecto";
import { EstadoTrayecto } from "../enums";

const trayectoSchema = new Schema<TrayectoDatos>({
    origenNombre: { type: String, required: true, trim: true },
    origenLatitud: { type: Number, required: true, min: -90, max: 90 },
    origenLongitud: { type: Number, required: true, min: -180, max: 180 },
    destinoNombre: { type: String, required: true, trim: true },
    destinoLatitud: { type: Number, required: true, min: -90, max: 90 },
    destinoLongitud: { type: Number, required: true, min: -180, max: 180 },
    distanciaKm: { type: Number, required: true, min: 0 },
    duracionEstimadaMin: {
        type: Number,
        required: true,
        validate: {
            validator: Number.isInteger,
            message: "La duración debe expresarse en minutos enteros",
        },
    },
    estado: {
        type: String,
        enum: Object.values(EstadoTrayecto),
        required: true,
        default: EstadoTrayecto.PLANIFICADO,
    },
    creadoEn: { type: Date, default: Date.now },
    iniciadoEn: { type: Date },
    finalizadoEn: { type: Date },
    // Relación "Realiza": N trayectos -> 1 usuario
    usuarioId: {
        type: Schema.Types.ObjectId,
        ref: "Usuario",
        required: true,
    },
});

const TrayectoModel = models.Trayecto ?? model<TrayectoDatos>("Trayecto", trayectoSchema);

export default TrayectoModel;
