import { model, models, Schema } from "mongoose";
import { TrayectoDatos } from "../types/trayecto";

const trayectoSchema = new Schema<TrayectoDatos>({
    origenNombre: { type: String, required: true, trim: true },
    origenLatitud: { type: Number, required: true },
    origenLongitud: { type: Number, required: true },
    destinoNombre: { type: String, required: true, trim: true },
    destinoLatitud: { type: Number, required: true },
    destinoLongitud: { type: Number, required: true },
    distanciaKm: { type: Number, required: true },
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
        enum: ["EN_CURSO", "FINALIZADO", "INICIADO", "PLANIFICADO"],
        required: true,
    },
    creadoEn: { type: Date, default: Date.now },
    iniciadoEn: { type: Date },
    finalizadoEn: { type: Date },
    usuarioId: {
        type: Schema.Types.ObjectId,
        ref: "Usuario",
        required: true,
    }
});

const TrayectoModel = models.Trayecto ?? model<TrayectoDatos>("Trayecto", trayectoSchema);

export default TrayectoModel;