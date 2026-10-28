import { connectDB } from "../db/mongodb";
import RutaModel from "../models/Ruta";

export type RutaPublica = {
    id: string;
    nombre: string;
    longitudKm: number;
};

export async function listarRutas(): Promise<RutaPublica[]> {
    await connectDB();

    const rutas = await RutaModel.find().sort({ nombre: 1 }).lean();

    return rutas.map((r) => ({
        id: String(r._id),
        nombre: r.nombre,
        longitudKm: r.longitudKm,
    }));
}