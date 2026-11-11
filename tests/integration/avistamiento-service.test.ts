// @vitest-environment node

import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { connectDB, disconnectDB } from "@/lib/db/mongodb";
import { NivelRiesgo } from "@/lib/enums";
import AvistamientoModel from "@/lib/models/Avistamiento";
import EspecieModel from "@/lib/models/Especie";
import RutaModel from "@/lib/models/Ruta";
import UsuarioModel from "@/lib/models/Usuario";
import { AvistamientoDuplicadoError, crearAvistamiento } from "@/lib/services/avistamiento.service";

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
  await connectDB();
  await Promise.all([
    UsuarioModel.init(),
    EspecieModel.init(),
    RutaModel.init(),
    AvistamientoModel.init(),
  ]);
});

beforeEach(async () => {
  await Promise.all([
    UsuarioModel.deleteMany({}),
    EspecieModel.deleteMany({}),
    RutaModel.deleteMany({}),
    AvistamientoModel.deleteMany({}),
  ]);
});

afterAll(async () => {
  await disconnectDB();
  await mongo.stop();
});

describe("crearAvistamiento", () => {
  it("registra un reporte con ubicación GPS sin ruta ni kilómetro", async () => {
    const [user, species] = await Promise.all([
      UsuarioModel.create({
        nombre: "Ana",
        email: "ana@example.com",
        contraseniaHash: "hash",
      }),
      EspecieModel.create({
        nombre: "Carpincho",
        alias: ["Capibara"],
        nivelRiesgo: NivelRiesgo.ALTO,
      }),
    ]);

    const created = await crearAvistamiento(
      {
        especieId: String(species._id),
        locationMode: "gps",
        coordinates: [-56.2, -34.5],
        descripcion: "Cruce cerca del arroyo",
        esAnonimo: true,
      },
      String(user._id),
    );

    expect(created).toMatchObject({
      especie: { id: String(species._id), nombre: "Carpincho", nivelRiesgo: NivelRiesgo.ALTO },
      rutaId: null,
      km: null,
      ubicacion: { type: "Point", coordinates: [-56.2, -34.5] },
      metodo: "MANUAL",
      esAnonimo: true,
      esPropio: true,
      estado: "ACTIVO",
    });
    expect(await AvistamientoModel.countDocuments()).toBe(1);
  });

  it("rechaza referencias a especies o rutas inexistentes", async () => {
    const user = await UsuarioModel.create({
      nombre: "Ana",
      email: "ana@example.com",
      contraseniaHash: "hash",
    });
    const species = await EspecieModel.create({
      nombre: "Carpincho",
      alias: [],
      nivelRiesgo: NivelRiesgo.ALTO,
    });

    await expect(crearAvistamiento(
      {
        especieId: String(species._id),
        locationMode: "route-km",
        rutaId: "000000000000000000000001",
        km: 42,
        esAnonimo: false,
      },
      String(user._id),
    )).resolves.toBeNull();
    await expect(crearAvistamiento(
      {
        especieId: "000000000000000000000001",
        locationMode: "gps",
        coordinates: [-56.2, -34.5],
        esAnonimo: false,
      },
      String(user._id),
    )).resolves.toBeNull();
    expect(await AvistamientoModel.countDocuments()).toBe(0);
  });

  it("guarda los datos del taxón de iNaturalist al crear el reporte", async () => {
    const user = await UsuarioModel.create({
      nombre: "Ana",
      email: "ana@example.com",
      contraseniaHash: "hash",
    });
    const oldSpecies = await EspecieModel.create({
      nombre: "Carpincho",
      alias: ["Capibara"],
      nivelRiesgo: NivelRiesgo.ALTO,
    });
    const response = {
      results: [{
        id: 12345,
        rank: "species",
        name: "Hydrochoerus hydrochaeris",
        preferred_common_name: "Carpincho",
        default_photo: {
          medium_url: "https://inaturalist-open-data.s3.amazonaws.com/photos/123/medium.jpg",
          attribution: "(c) Fotógrafa (CC BY)",
          license_code: "cc-by",
        },
      }],
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(response), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const created = await crearAvistamiento(
      {
        inaturalistTaxonId: 12345,
        nivelRiesgo: NivelRiesgo.MEDIO,
        locationMode: "gps",
        coordinates: [-56.2, -34.5],
        esAnonimo: false,
      },
      String(user._id),
    );

    expect(created?.especie).toMatchObject({
      nombre: "Carpincho",
      nombreCientifico: "Hydrochoerus hydrochaeris",
      inaturalistTaxonId: 12345,
      fotoReferencia: "https://inaturalist-open-data.s3.amazonaws.com/photos/123/medium.jpg",
      atribucionFoto: "(c) Fotógrafa (CC BY)",
      licenciaFoto: "cc-by",
      nivelRiesgo: NivelRiesgo.MEDIO,
    });
    const taxonUrl = new URL(String(fetchMock.mock.calls[0][0]));
    expect(taxonUrl.pathname).toBe("/v1/taxa/12345");
    expect(taxonUrl.searchParams.get("locale")).toBe("es");
    expect(created?.foto).toBeNull();
    expect(await EspecieModel.countDocuments()).toBe(2);
    expect(await EspecieModel.findById(oldSpecies._id).lean()).toMatchObject({
      nivelRiesgo: NivelRiesgo.ALTO,
    });
    expect(await EspecieModel.findOne({ inaturalistTaxonId: 12345 }).lean()).toMatchObject({
      nombre: "Hydrochoerus hydrochaeris",
      nombreComun: "Carpincho",
      nivelRiesgo: NivelRiesgo.MEDIO,
    });
    expect(await AvistamientoModel.countDocuments()).toBe(1);
  });

  it("conserva la clasificación local ya existente para un taxón", async () => {
    const user = await UsuarioModel.create({
      nombre: "Ana",
      email: "ana@example.com",
      contraseniaHash: "hash",
    });
    await EspecieModel.create({
      nombre: "Hydrochoerus hydrochaeris",
      nombreComun: "Carpincho",
      alias: [],
      nivelRiesgo: NivelRiesgo.ALTO,
      inaturalistTaxonId: 12345,
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        results: [{
          id: 12345,
          rank: "species",
          name: "Hydrochoerus hydrochaeris",
          preferred_common_name: "Carpincho",
        }],
      }), { status: 200 }),
    ));

    const created = await crearAvistamiento(
      {
        inaturalistTaxonId: 12345,
        nivelRiesgo: NivelRiesgo.BAJO,
        locationMode: "gps",
        coordinates: [-56.2, -34.5],
        esAnonimo: false,
      },
      String(user._id),
    );

    expect(created?.especie?.nivelRiesgo).toBe(NivelRiesgo.ALTO);
    expect(await EspecieModel.countDocuments()).toBe(1);
  });

  it("deriva el pin del kilómetro seleccionado sobre la geometría oficial del MTOP", async () => {
    const [user, species, route] = await Promise.all([
      UsuarioModel.create({
        nombre: "Ana",
        email: "ana@example.com",
        contraseniaHash: "hash",
      }),
      EspecieModel.create({
        nombre: "Carpincho",
        alias: [],
        nivelRiesgo: NivelRiesgo.ALTO,
      }),
      RutaModel.create({ nombre: "Ruta 5", longitudKm: 100, codigoMtop: "5" }),
    ]);
    const routeFeature = {
      type: "Feature",
      geometry: {
        type: "MultiLineString",
        coordinates: [[[-56.25, -34.36], [-56.24, -34.35]]],
      },
      properties: { nom_sd: "5" },
    };
    const milestoneFeature = {
      type: "Feature",
      geometry: { type: "Point", coordinates: [-56.245, -34.355] },
      properties: { nom_sd: "5", progresiva: 65 },
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const typeName = new URL(String(input)).searchParams.get("typeNames");
      const features = typeName === "rutas_SD:uylcami1g_sd" ? [routeFeature] : [milestoneFeature];
      return new Response(JSON.stringify({ features }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const created = await crearAvistamiento(
      {
        especieId: String(species._id),
        locationMode: "route-km",
        rutaId: String(route._id),
        km: 65,
        esAnonimo: false,
      },
      String(user._id),
    );

    expect(created).toMatchObject({
      rutaId: String(route._id),
      km: 65,
      ubicacion: { type: "Point", coordinates: [-56.245, -34.355] },
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("crearAvistamiento: duplicados", () => {
  async function preparar() {
    const [user, species] = await Promise.all([
      UsuarioModel.create({ nombre: "Ana", email: "ana@example.com", contraseniaHash: "hash" }),
      EspecieModel.create({ nombre: "Carpincho", alias: [], nivelRiesgo: NivelRiesgo.ALTO }),
    ]);
    const reporte = (coordinates: [number, number]) => crearAvistamiento(
      { especieId: String(species._id), locationMode: "gps", coordinates, esAnonimo: false },
      String(user._id),
    );
    return { reporte };
  }

  it("rechaza el mismo animal reportado dos veces en el mismo lugar", async () => {
    const { reporte } = await preparar();

    await reporte([-58.07, -32.32]);
    await expect(reporte([-58.0705, -32.3201])).rejects.toBeInstanceOf(AvistamientoDuplicadoError); // ~50 m

    expect(await AvistamientoModel.countDocuments()).toBe(1);
  });

  it("si llegan dos peticiones a la vez, guarda solo una", async () => {
    const { reporte } = await preparar();

    const resultados = await Promise.allSettled([reporte([-58.07, -32.32]), reporte([-58.07, -32.32])]);

    expect(resultados.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await AvistamientoModel.countDocuments()).toBe(1);
  });

  it("acepta el mismo animal lejos (otro ejemplar)", async () => {
    const { reporte } = await preparar();

    await reporte([-58.07, -32.32]);
    await reporte([-58.10, -32.32]); // ~3 km

    expect(await AvistamientoModel.countDocuments()).toBe(2);
  });
});
