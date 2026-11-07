import { connectDB } from "../db/mongodb"
import { escapeRegex } from "../http/params";
import EspecieModel from "../models/Especie";
import { NivelRiesgo } from "../enums";
import type { TaxonDeINaturalist } from "./inaturalist.service";

export type EspeciePublica = {
    id: string,
    nombre: string,
    alias: string[],
    nivelRiesgo: string,
    inaturalistTaxonId: number | null,
    nombreCientifico: string | null,
    fotoReferencia: string | null,
    atribucionFoto: string | null,
    licenciaFoto: string | null,
}

function datosTaxon(taxon: TaxonDeINaturalist, nombre: string) {
    return {
        nombre,
        nombreComun: taxon.nombreComun,
        nombreCientifico: taxon.nombreCientifico,
        inaturalistTaxonId: taxon.id,
        fotoReferencia: taxon.fotoReferencia,
        atribucionFoto: taxon.atribucionFoto,
        licenciaFoto: taxon.licenciaFoto,
    };
}

export async function obtenerOCrearEspecieDesdeTaxon(
    taxon: TaxonDeINaturalist,
    nivelRiesgo: Exclude<NivelRiesgo, NivelRiesgo.SIN_CLASIFICAR>,
) {
    await connectDB();

    const existente = await EspecieModel.findOne({ inaturalistTaxonId: taxon.id });
    if (existente) {
        existente.set(datosTaxon(taxon, existente.nombre));
        if (existente.nivelRiesgo === NivelRiesgo.SIN_CLASIFICAR) {
            existente.nivelRiesgo = nivelRiesgo;
        }
        await existente.save();
        return existente;
    }

    const nombre = await EspecieModel.exists({
        nombre: taxon.nombreCientifico,
        inaturalistTaxonId: { $ne: taxon.id },
    })
        ? `${taxon.nombreCientifico} [iNaturalist ${taxon.id}]`
        : taxon.nombreCientifico;

    try {
        const especie = await EspecieModel.findOneAndUpdate(
            { inaturalistTaxonId: taxon.id },
            {
                $set: datosTaxon(taxon, nombre),
                $setOnInsert: {
                    alias: [],
                    nivelRiesgo,
                },
            },
            { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
        );
        if (especie?.nivelRiesgo === NivelRiesgo.SIN_CLASIFICAR) {
            especie.nivelRiesgo = nivelRiesgo;
            await especie.save();
        }
        return especie;
    } catch (error) {
        if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
            const concurrente = await EspecieModel.findOne({ inaturalistTaxonId: taxon.id });
            if (concurrente) {
                if (concurrente.nivelRiesgo === NivelRiesgo.SIN_CLASIFICAR) {
                    concurrente.nivelRiesgo = nivelRiesgo;
                    await concurrente.save();
                }
                return concurrente;
            }
        }
        throw error;
    }
}

export async function buscarEspecies(q?: string): Promise<EspeciePublica[]>{
    await connectDB();

    const filtro = q
        ? (() => {
              const regex = new RegExp(escapeRegex(q), "i");
              return { $or: [{ nombre: regex }, { nombreComun: regex }, { alias: regex }] };
          })()
        : {};

    const especies = await EspecieModel.find(filtro).sort({nombre: 1}).limit(50).lean();

    return especies.map((e) => ({
        id: String(e._id),
        nombre: e.nombreComun || e.nombre,
        alias: e.alias ?? [],
        nivelRiesgo: e.nivelRiesgo,
        inaturalistTaxonId: e.inaturalistTaxonId ?? null,
        nombreCientifico: e.nombreCientifico ?? null,
        fotoReferencia: e.fotoReferencia ?? null,
        atribucionFoto: e.atribucionFoto ?? null,
        licenciaFoto: e.licenciaFoto ?? null,
    }));

}