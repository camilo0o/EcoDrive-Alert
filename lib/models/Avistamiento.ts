import { model, models, Schema } from "mongoose";
import { AvistamientoDatos } from "../types/avistamiento";
import { EstadoAvistamiento, MetodoReporte } from "../enums";
import { puntoSchema } from "./schemas/punto.schema";

const avistamientoSchema = new Schema<AvistamientoDatos>(
    {
        usuarioId: { type: Schema.Types.ObjectId, ref: "Usuario", required: true },
        especieId: { type: Schema.Types.ObjectId, ref: "Especie", required: true },
        rutaId: { type: Schema.Types.ObjectId, ref: "Ruta" },
        fechaHora: { type: Date, required: true, default: Date.now },
        ubicacion: { type: puntoSchema, required: true },
        km: { type: Number, min: 0 },
        foto: { type: String }, 
        descripcion: { type: String, trim: true },
        transcripcion: { type: String, trim: true }, // texto reconocido en reportes por AUDIO
        metodo: {
            type: String,
            enum: Object.values(MetodoReporte),
            required: true,
        },
        confianza: { type: Number, min: 0, max: 1 }, 
        esAnonimo: { type: Boolean, required: true, default: false },
        estado: {
            type: String,
            enum: Object.values(EstadoAvistamiento),
            required: true,
            default: EstadoAvistamiento.ACTIVO,
        },
    },
    { timestamps: true }
);

// Permite consultas por cercanía ($near, $geoWithin)
avistamientoSchema.index({ ubicacion: "2dsphere" });

const AvistamientoModel =
    models.Avistamiento ?? model<AvistamientoDatos>("Avistamiento", avistamientoSchema);

export default AvistamientoModel;
