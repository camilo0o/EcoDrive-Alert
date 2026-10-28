// @vitest-environment node

import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { connectDB, disconnectDB } from "@/lib/db/mongodb";
import { NivelRiesgo } from "@/lib/enums";
import AvistamientoModel from "@/lib/models/Avistamiento";
import EspecieModel from "@/lib/models/Especie";
import RutaModel from "@/lib/models/Ruta";
import UsuarioModel from "@/lib/models/Usuario";
import { crearAvistamiento } from "@/lib/services/avistamiento.service";

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
  it("registra un reporte manual relacionado con una especie, ruta y usuario", async () => {
    const [user, species, route] = await Promise.all([
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
      RutaModel.create({ nombre: "Ruta 1", longitudKm: 177 }),
    ]);

    const created = await crearAvistamiento(
      {
        especieId: String(species._id),
        rutaId: String(route._id),
        km: 42,
        coordinates: [-56.2, -34.5],
        descripcion: "Cruce cerca del arroyo",
        esAnonimo: true,
      },
      String(user._id),
    );

    expect(created).toMatchObject({
      especie: { id: String(species._id), nombre: "Carpincho", nivelRiesgo: NivelRiesgo.ALTO },
      rutaId: String(route._id),
      km: 42,
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
        rutaId: "000000000000000000000001",
        coordinates: [-56.2, -34.5],
        esAnonimo: false,
      },
      String(user._id),
    )).resolves.toBeNull();
    await expect(crearAvistamiento(
      {
        especieId: "000000000000000000000001",
        coordinates: [-56.2, -34.5],
        esAnonimo: false,
      },
      String(user._id),
    )).resolves.toBeNull();
    expect(await AvistamientoModel.countDocuments()).toBe(0);
  });
});
