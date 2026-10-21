import { model, models, Schema } from "mongoose";
import { EspecieDatos } from "../types/especie";
import { NivelRiesgo } from "../enums";

const especieSchema = new Schema<EspecieDatos>(
    {
        nombre: { type: String, required: true, trim: true, unique: true },
        alias: { type: [String], default: [] },
        nivelRiesgo: {
            type: String,
            enum: Object.values(NivelRiesgo),
            required: true,
        },
    },
    { timestamps: true }
);

const EspecieModel = models.Especie ?? model<EspecieDatos>("Especie", especieSchema);

export default EspecieModel;
