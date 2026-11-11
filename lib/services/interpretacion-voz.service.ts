import { connectDB } from "../db/mongodb";
import EspecieModel from "../models/Especie";
import { buscarTaxonesINaturalist, type TaxonDeINaturalist } from "./inaturalist.service";

/** Especie candidata. Trae `especieId` si ya existe en Mongo o `inaturalistTaxonId` si viene de iNaturalist. */
export type EspecieInterpretada = {
    especieId: string | null;
    inaturalistTaxonId: number | null;
    nombre: string;
    nombreCientifico: string | null;
    nivelRiesgo: string | null;
    fotoReferencia: string | null;
};

export type ResultadoInterpretacion =
    | { estado: "encontrada"; especie: EspecieInterpretada }
    | { estado: "ambigua"; opciones: EspecieInterpretada[] }
    | { estado: "no-entendida" };

const MAX_OPCIONES = 3;

/** Palabras que no nombran al animal: se descartan antes de preguntarle a iNaturalist. */
const PALABRAS_DE_RELLENO = new Set([
    "vi", "veo", "vimos", "visto", "hay", "habia", "acabo", "de", "ver",
    "un", "una", "unos", "unas", "el", "la", "los", "las", "lo", "al", "del",
    "a", "en", "por", "sobre", "con", "que", "y", "o", "se", "me", "mi", "es", "era",
    "esta", "estaba", "estan", "ahi", "aca", "alla", "cerca", "medio", "mitad",
    "cruzando", "cruza", "cruzo", "cruzaba", "corriendo", "caminando", "parado", "parada",
    "muerto", "muerta", "atropellado", "atropellada", "suelto", "suelta",
    "ruta", "rutas", "km", "kilometro", "kilometros", "camino", "calle", "calzada",
    "banquina", "costado", "puente", "grande", "chico", "chica", "pequeno", "pequena",
    "creo", "parece", "tipo", "como", "algo", "bicho", "animal",
]);

/** Minúsculas, sin tildes ni signos: "¡Vi un Ñandú!" → "vi un nandu". */
export function normalizar(texto: string): string {
    return texto
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function escaparRegex(texto: string) {
    return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** ¿El término aparece como palabra completa en la frase? Acepta plural simple ("carpinchos"). */
export function contieneTermino(fraseNormalizada: string, termino: string): boolean {
    const t = normalizar(termino);
    if (!t) return false;
    return new RegExp(`(^|\\s)${escaparRegex(t)}(s|es)?(\\s|$)`).test(fraseNormalizada);
}

/** Saca el relleno y los números: "vi un zorro gris en la ruta 9" → "zorro gris". */
export function extraerNombreAnimal(texto: string): string {
    return normalizar(texto)
        .split(" ")
        .filter((palabra) => palabra.length > 1 && !/^\d+$/.test(palabra) && !PALABRAS_DE_RELLENO.has(palabra))
        .slice(0, 3)
        .join(" ");
}

type EspecieLocal = {
    _id: unknown;
    nombre: string;
    nombreComun?: string;
    alias?: string[];
    nivelRiesgo: string;
    inaturalistTaxonId?: number;
    nombreCientifico?: string;
    fotoReferencia?: string;
};

function desdeLocal(e: EspecieLocal): EspecieInterpretada {
    return {
        especieId: String(e._id),
        inaturalistTaxonId: e.inaturalistTaxonId ?? null,
        nombre: e.nombreComun || e.nombre,
        nombreCientifico: e.nombreCientifico ?? null,
        nivelRiesgo: e.nivelRiesgo,
        fotoReferencia: e.fotoReferencia ?? null,
    };
}

function desdeTaxon(t: TaxonDeINaturalist): EspecieInterpretada {
    return {
        especieId: null,
        inaturalistTaxonId: t.id,
        nombre: t.nombreComun ?? t.nombreCientifico,
        nombreCientifico: t.nombreCientifico,
        nivelRiesgo: null,
        fotoReferencia: t.fotoReferencia ?? null,
    };
}

/**
 * Busca qué especie del catálogo se menciona en la frase.
 * Gana el término más largo: en "vi un zorro gris", "zorro gris" le gana a "zorro".
 */
export function buscarEnCatalogo(frase: string, especies: EspecieLocal[]): EspecieLocal[] {
    const fraseNormalizada = normalizar(frase);
    let mejorLargo = 0;
    let mejores: EspecieLocal[] = [];

    for (const especie of especies) {
        const terminos = [especie.nombre, especie.nombreComun, especie.nombreCientifico, ...(especie.alias ?? [])]
            .filter((t): t is string => Boolean(t));
        const largo = Math.max(0, ...terminos
            .filter((t) => contieneTermino(fraseNormalizada, t))
            .map((t) => normalizar(t).length));

        if (largo === 0) continue;
        if (largo > mejorLargo) {
            mejorLargo = largo;
            mejores = [especie];
        } else if (largo === mejorLargo) {
            mejores.push(especie);
        }
    }
    return mejores;
}

function elegirTaxon(nombreBuscado: string, taxa: TaxonDeINaturalist[]): ResultadoInterpretacion {
    if (taxa.length === 0) return { estado: "no-entendida" };

    const exacto = taxa.find((t) => t.nombreComun && normalizar(t.nombreComun) === nombreBuscado);
    if (exacto) return { estado: "encontrada", especie: desdeTaxon(exacto) };
    if (taxa.length === 1) return { estado: "encontrada", especie: desdeTaxon(taxa[0]) };

    return { estado: "ambigua", opciones: taxa.slice(0, MAX_OPCIONES).map(desdeTaxon) };
}

/** Texto libre → especie. Primero mira la base (rápido, ya tiene riesgo); si no, pregunta a iNaturalist. */
export async function interpretarTexto(texto: string): Promise<ResultadoInterpretacion> {
    await connectDB();

    const especies = await EspecieModel.find()
        .select("nombre nombreComun alias nivelRiesgo inaturalistTaxonId nombreCientifico fotoReferencia")
        .lean<EspecieLocal[]>();

    const locales = buscarEnCatalogo(texto, especies);
    if (locales.length === 1) return { estado: "encontrada", especie: desdeLocal(locales[0]) };
    if (locales.length > 1) {
        return { estado: "ambigua", opciones: locales.slice(0, MAX_OPCIONES).map(desdeLocal) };
    }

    const nombre = extraerNombreAnimal(texto);
    if (nombre.length < 2) return { estado: "no-entendida" };

    // Si "zorro gris costado" no da nada, probamos con la primera palabra: "zorro".
    const intentos = [...new Set([nombre, nombre.split(" ")[0]])].filter((q) => q.length >= 2);
    for (const intento of intentos) {
        const taxa = await buscarTaxonesINaturalist(intento);
        if (taxa.length > 0) return elegirTaxon(intento, taxa);
    }
    return { estado: "no-entendida" };
}
