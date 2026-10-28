import { connectDB } from "../db/mongodb"
import { escapeRegex } from "../http/params";
import EspecieModel from "../models/Especie";

export type EspeciePublica = {
    id: string,
    nombre: string,
    alias: string[],
    nivelRiesgo: string
}

export async function buscarEspecies(q?: string): Promise<EspeciePublica[]>{
    await connectDB();

    const filtro = q
        ? (() => {
              const regex = new RegExp(escapeRegex(q), "i");
              return { $or: [{ nombre: regex }, { alias: regex }] };
          })()
        : {};

    const especies = await EspecieModel.find(filtro).sort({nombre: 1}).limit(50).lean();

    return especies.map((e) => ({
        id: String(e._id),
        nombre: e.nombre,
        alias: e.alias ?? [],
        nivelRiesgo: e.nivelRiesgo
    }));

}