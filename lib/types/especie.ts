import { NivelRiesgo } from "../enums";

export interface EspecieDatos {
    nombre: string;
    nombreComun?: string;
    alias: string[];
    nivelRiesgo: NivelRiesgo;
    inaturalistTaxonId?: number;
    nombreCientifico?: string;
    fotoReferencia?: string;
    atribucionFoto?: string;
    licenciaFoto?: string;
}
