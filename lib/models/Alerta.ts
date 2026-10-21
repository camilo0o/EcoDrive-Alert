import { model, models, Schema } from "mongoose";
import { AlertaDatos } from "../types/alerta";

const alertaSchema = new Schema<AlertaDatos>({
    mensaje: { type: String, required: true, trim: true },
    fechaHora: { type: Date, required: true },
    distancia: { type: String, required: true },
    visto: { type: Boolean, required: true, default: false },
    trayectoId: {
        type: Schema.Types.ObjectId,
        ref: "Trayecto",
        required: true,
    },
});

const AlertaModel = models.Alerta ?? model<AlertaDatos>("Alerta", alertaSchema);
export default AlertaModel;