import { model, models, Schema } from "mongoose";
import { TrayectoDatos } from "../types/trayecto";

const trayectoSchema = new Schema<TrayectoDatos>({
    origen: { type: String, required: true, trim: true },
    destino: { type: String, required: true, trim: true },
    distanciaKm: { type: Number, required: true },
    duracionMinutos: { 
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