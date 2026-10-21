import { model, models, Schema } from "mongoose";
import { AlertaDatos } from "../types/alerta";

const alertaSchema = new Schema<AlertaDatos>({
    mensaje: { type: String, required: true, trim: true },
    fechaHora: { type: Date, required: true, default: Date.now },
    distanciaKm: { type: Number, required: true, min: 0 },
    visto: { type: Boolean, required: true, default: false },
    // Relación "Recibe": N alertas -> 1 trayecto
    trayectoId: {
        type: Schema.Types.ObjectId,
        ref: "Trayecto",
        required: true,
    },
    // Relación "Informa": N alertas -> 1 avistamiento
    avistamientoId: {
        type: Schema.Types.ObjectId,
        ref: "Avistamiento",
        required: true,
    },
});

const AlertaModel = models.Alerta ?? model<AlertaDatos>("Alerta", alertaSchema);

export default AlertaModel;
