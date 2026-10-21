import { model, models, Schema } from "mongoose";
import { TrayectoRutaDatos } from "../types/trayecto-ruta";


const trayectoRutaSchema = new Schema<TrayectoRutaDatos>({
    trayectoId: {
        type: Schema.Types.ObjectId,
        ref: "Trayecto",
        required: true,
    },
    rutaId:{
        type: Schema.Types.ObjectId,
        ref: "Ruta",
        required: true,
    },
    orden:{
        type: Number,
        required: true,
        min: 1,
        validate: {
            validator: Number.isInteger,
            message: "El orden debe ser un número entero"
        },
    },
});

trayectoRutaSchema.index({ trayectoId: 1, orden: 1 }, { unique: true });
const TrayectoRutaModel = models.TrayectoRuta ?? model<TrayectoRutaDatos>("TrayectoRuta", trayectoRutaSchema);
export default TrayectoRutaModel;