// @vitest-environment node

import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { connectDB, disconnectDB } from "@/lib/db/mongodb";
import { MetodoReporte, NivelRiesgo } from "@/lib/enums";
import AvistamientoModel from "@/lib/models/Avistamiento";
import EspecieModel from "@/lib/models/Especie";
import UsuarioModel from "@/lib/models/Usuario";
import { crearAvistamiento } from "@/lib/services/avistamiento.service";
import { obtenerOCrearEspecieDesdeTaxon } from "@/lib/services/especie.service";
import { extraerNombreAnimal, interpretarTexto } from "@/lib/services/interpretacion-voz.service";

let mongo: MongoMemoryServer;

function respuestaINaturalist(results: unknown[]) {
  return new Response(JSON.stringify({ results }), { status: 200 });
}

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
  await connectDB();
  await Promise.all([EspecieModel.init(), AvistamientoModel.init(), UsuarioModel.init()]);
});

beforeEach(async () => {
  await Promise.all([EspecieModel.deleteMany({}), AvistamientoModel.deleteMany({}), UsuarioModel.deleteMany({})]);
  await EspecieModel.create([
    { nombre: "Carpincho", alias: ["Capibara"], nivelRiesgo: NivelRiesgo.ALTO },
    { nombre: "Zorro de monte", alias: ["Zorro"], nivelRiesgo: NivelRiesgo.MEDIO },
    { nombre: "Zorro gris", alias: ["Zorro pampeano"], nivelRiesgo: NivelRiesgo.MEDIO },
    { nombre: "Mulita", alias: ["Tatú"], nivelRiesgo: NivelRiesgo.BAJO },
  ]);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

afterAll(async () => {
  await disconnectDB();
  await mongo.stop();
});

describe("extraerNombreAnimal", () => {
  it("descarta el relleno y los números", () => {
    expect(extraerNombreAnimal("Vi un carpincho cruzando la ruta 9")).toBe("carpincho");
    expect(extraerNombreAnimal("¡Acabo de ver un ñandú!")).toBe("nandu");
  });
});

describe("interpretarTexto", () => {
  it("encuentra una especie de la base sin consultar iNaturalist", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await interpretarTexto("Vi unos CARPINCHOS cruzando la ruta");

    expect(result).toMatchObject({ estado: "encontrada", especie: { nombre: "Carpincho", nivelRiesgo: "ALTO" } });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("acepta alias con tilde y prefiere el término más largo", async () => {
    await expect(interpretarTexto("hay una tatu")).resolves.toMatchObject({ especie: { nombre: "Mulita" } });
    await expect(interpretarTexto("vi un zorro gris")).resolves.toMatchObject({ especie: { nombre: "Zorro gris" } });
  });

  it("si la base no lo tiene, busca el nombre extraído en iNaturalist", async () => {
    const fetchMock = vi.fn().mockResolvedValue(respuestaINaturalist([
      { id: 1, rank: "species", name: "Rhea americana", preferred_common_name: "Ñandú" },
      { id: 2, rank: "species", name: "Rhea pennata", preferred_common_name: "Ñandú petiso" },
    ]));
    vi.stubGlobal("fetch", fetchMock);

    const result = await interpretarTexto("Vi un ñandú en la banquina");

    expect(String(fetchMock.mock.calls[0][0])).toContain("q=nandu");
    expect(result).toMatchObject({
      estado: "encontrada",
      especie: { especieId: null, inaturalistTaxonId: 1, nombre: "Ñandú", nivelRiesgo: null },
    });
  });

  it("devuelve opciones cuando iNaturalist no tiene una coincidencia exacta", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(respuestaINaturalist([
      { id: 10, rank: "species", name: "Lontra longicaudis", preferred_common_name: "Lobito de río" },
      { id: 11, rank: "species", name: "Pteronura brasiliensis", preferred_common_name: "Lobo gargantilla" },
    ])));

    const result = await interpretarTexto("vi un lobo");

    expect(result.estado).toBe("ambigua");
  });

  it("responde no-entendida si no queda ningún nombre", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(interpretarTexto("vi un en la ruta 3")).resolves.toEqual({ estado: "no-entendida" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("crearAvistamiento por voz", () => {
  it("guarda método AUDIO y la transcripción", async () => {
    const user = await UsuarioModel.create({ nombre: "Ana", email: "ana@example.com", contraseniaHash: "hash" });
    const especie = await EspecieModel.findOne({ nombre: "Carpincho" });

    await crearAvistamiento(
      {
        especieId: String(especie!._id),
        locationMode: "gps",
        coordinates: [-58.07, -32.32],
        esAnonimo: false,
        metodo: MetodoReporte.AUDIO,
        transcripcion: "Vi un carpincho cruzando la ruta",
      },
      String(user._id),
    );

    const guardado = await AvistamientoModel.findOne().lean();
    expect(guardado).toMatchObject({ metodo: "AUDIO", transcripcion: "Vi un carpincho cruzando la ruta" });
  });

  it("una especie SIN_CLASIFICAR toma el riesgo del siguiente reporte, pero no pisa uno existente", async () => {
    const taxon = { id: 99, nombreCientifico: "Rhea americana", nombreComun: "Ñandú" };

    const creada = await obtenerOCrearEspecieDesdeTaxon(taxon, NivelRiesgo.SIN_CLASIFICAR);
    expect(creada?.nivelRiesgo).toBe(NivelRiesgo.SIN_CLASIFICAR);

    const clasificada = await obtenerOCrearEspecieDesdeTaxon(taxon, NivelRiesgo.ALTO);
    expect(clasificada?.nivelRiesgo).toBe(NivelRiesgo.ALTO);

    const intacta = await obtenerOCrearEspecieDesdeTaxon(taxon, NivelRiesgo.BAJO);
    expect(intacta?.nivelRiesgo).toBe(NivelRiesgo.ALTO);
  });
});
