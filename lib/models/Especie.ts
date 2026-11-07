import { model, models, Schema } from "mongoose";
import { EspecieDatos } from "../types/especie";
import { NivelRiesgo } from "../enums";

const especieSchema = new Schema<EspecieDatos>(
    {
        nombre: { type: String, required: true, trim: true, unique: true },
        nombreComun: { type: String, trim: true },
        alias: { type: [String], default: [] },
        nivelRiesgo: {
            type: String,
            enum: Object.values(NivelRiesgo),
            required: true,
        },
        inaturalistTaxonId: { type: Number, min: 1 },
        nombreCientifico: { type: String, trim: true },
        fotoReferencia: { type: String },
        atribucionFoto: { type: String },
        licenciaFoto: { type: String },
    },
    { timestamps: true }
);

especieSchema.index({ inaturalistTaxonId: 1 }, { unique: true, sparse: true });

const EspecieModel = models.Especie ?? model<EspecieDatos>("Especie", especieSchema);

export default EspecieModel;
