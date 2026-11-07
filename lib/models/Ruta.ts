import { model, models, Schema } from "mongoose";
import { RutaDatos } from "../types/ruta";


const rutaSchema = new Schema<RutaDatos>({
    nombre: { type: String, required: true, trim: true },
    longitudKm: { type: Number, required: true },
    codigoMtop: { type: String, trim: true },
});

rutaSchema.index({ codigoMtop: 1 }, { unique: true, sparse: true });

const RutaModel = models.Ruta ?? model<RutaDatos>("Ruta", rutaSchema);

export default RutaModel;