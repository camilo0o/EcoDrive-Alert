import { Schema } from "mongoose";
import { PuntoGeo } from "../../types/punto-geo";

// Sub-schema reutilizable para ubicaciones GeoJSON (necesario para el índice 2dsphere).
export const puntoSchema = new Schema<PuntoGeo>(
    {
        type: { type: String, enum: ["Point"], default: "Point", required: true },
        coordinates: {
            type: [Number],
            required: true,
            validate: {
                validator: (c: number[]) =>
                    c.length === 2 &&
                    c[0] >= -180 && c[0] <= 180 && // longitud
                    c[1] >= -90 && c[1] <= 90,     // latitud
                message: "Las coordenadas deben ser [longitud, latitud] válidas",
            },
        },
    },
    { _id: false }
);
