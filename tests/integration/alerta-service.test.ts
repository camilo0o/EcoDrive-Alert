// @vitest-environment node

import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { connectDB, disconnectDB } from "@/lib/db/mongodb";
import { EstadoAvistamiento, EstadoTrayecto, MetodoReporte, NivelRiesgo } from "@/lib/enums";
import AlertaModel from "@/lib/models/Alerta";
import AvistamientoModel from "@/lib/models/Avistamiento";
import EspecieModel from "@/lib/models/Especie";
import TrayectoModel from "@/lib/models/Trayecto";
import UsuarioModel from "@/lib/models/Usuario";
import {
  listarAlertasPorTrayecto,
  marcarAlertaVista,
  revisarAlertasParaUbicacion,
} from "@/lib/services/alerta.service";
import {
  finalizarTrayecto,
  iniciarTrayecto,
  obtenerTrayectoEnCurso,
  TrayectoEnCursoExistenteError,
} from "@/lib/services/trayecto.service";

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
  await connectDB();
  await Promise.all([
    UsuarioModel.init(),
    EspecieModel.init(),
    TrayectoModel.init(),
    AvistamientoModel.init(),
    AlertaModel.init(),
  ]);
});

beforeEach(async () => {
  await Promise.all([
    UsuarioModel.deleteMany({}),
    EspecieModel.deleteMany({}),
    TrayectoModel.deleteMany({}),
    AvistamientoModel.deleteMany({}),
    AlertaModel.deleteMany({}),
  ]);
});

afterAll(async () => {
  await disconnectDB();
  await mongo.stop();
});

describe("alertas de fauna durante el trayecto", () => {
  it("crea la alerta cuando el usuario está cerca de un avistamiento activo", async () => {
    const user = await UsuarioModel.create({
      nombre: "Ana",
      email: "ana@example.com",
      contraseniaHash: "hash",
    });

    const especie = await EspecieModel.create({
      nombre: "Carpincho",
      nombreComun: "Carpincho",
      alias: ["Capibara"],
      nivelRiesgo: NivelRiesgo.ALTO,
    });

    const trayecto = await TrayectoModel.create({
      origenNombre: "Montevideo",
      origenLatitud: -34.9,
      origenLongitud: -56.1,
      destinoNombre: "Punta del Este",
      destinoLatitud: -34.9,
      destinoLongitud: -54.9,
      distanciaKm: 120,
      duracionEstimadaMin: 180,
      estado: EstadoTrayecto.EN_CURSO,
      usuarioId: user._id,
    });

    await AvistamientoModel.create({
      usuarioId: user._id,
      especieId: especie._id,
      ubicacion: { type: "Point", coordinates: [-56.102, -34.901] },
      fechaHora: new Date(),
      metodo: MetodoReporte.MANUAL,
      esAnonimo: false,
      estado: EstadoAvistamiento.ACTIVO,
    });

    const result = await revisarAlertasParaUbicacion(
      String(trayecto._id),
      String(user._id),
      { lat: -34.9005, lng: -56.1012 },
      200,
    );

    expect(result.creadas).toBe(1);
    expect(result.alertas[0]).toMatchObject({
      visto: false,
      trayectoId: String(trayecto._id),
      mensaje: expect.stringContaining("Carpincho"),
    });
    expect(await AlertaModel.countDocuments()).toBe(1);

    const alertas = await listarAlertasPorTrayecto(String(trayecto._id), String(user._id));
    expect(alertas).toHaveLength(1);

    const marcada = await marcarAlertaVista(alertas[0]._id, String(user._id));
    expect(marcada?.visto).toBe(true);
    expect(await AlertaModel.findById(alertas[0]._id).lean()).toMatchObject({ visto: true });

    const posterior = await revisarAlertasParaUbicacion(
      String(trayecto._id),
      String(user._id),
      { lat: -34.9005, lng: -56.1012 },
      200,
    );
    expect(posterior.creadas).toBe(0);
  });

  it("no duplica alertas para el mismo avistamiento y no crea alertas fuera de rango", async () => {
    const user = await UsuarioModel.create({
      nombre: "Beto",
      email: "beto@example.com",
      contraseniaHash: "hash",
    });

    const especie = await EspecieModel.create({
      nombre: "Zorro gris",
      nombreComun: "Zorro gris",
      alias: [],
      nivelRiesgo: NivelRiesgo.MEDIO,
    });

    const trayecto = await TrayectoModel.create({
      origenNombre: "A",
      origenLatitud: -34.9,
      origenLongitud: -56.1,
      destinoNombre: "B",
      destinoLatitud: -34.8,
      destinoLongitud: -56.0,
      distanciaKm: 30,
      duracionEstimadaMin: 60,
      estado: EstadoTrayecto.EN_CURSO,
      usuarioId: user._id,
    });

    const avistamiento = await AvistamientoModel.create({
      usuarioId: user._id,
      especieId: especie._id,
      ubicacion: { type: "Point", coordinates: [-56.102, -34.9005] },
      fechaHora: new Date(),
      metodo: MetodoReporte.MANUAL,
      esAnonimo: false,
      estado: EstadoAvistamiento.ACTIVO,
    });

    const primera = await revisarAlertasParaUbicacion(
      String(trayecto._id),
      String(user._id),
      { lat: -34.9006, lng: -56.1019 },
      200,
    );

    expect(primera.creadas).toBe(1);

    const repetida = await revisarAlertasParaUbicacion(
      String(trayecto._id),
      String(user._id),
      { lat: -34.9006, lng: -56.1019 },
      200,
    );

    expect(repetida.creadas).toBe(0);

    const lejana = await revisarAlertasParaUbicacion(
      String(trayecto._id),
      String(user._id),
      { lat: -34.95, lng: -56.2 },
      100,
    );

    expect(lejana.creadas).toBe(0);
    expect(await AlertaModel.countDocuments({ avistamientoId: avistamiento._id })).toBe(1);
  });
});

describe("gestión del trayecto activo", () => {
  it("inicia un trayecto, impide otro simultáneo y permite finalizarlo", async () => {
    const user = await UsuarioModel.create({
      nombre: "Clara",
      email: "clara@example.com",
      contraseniaHash: "hash",
    });
    const userId = String(user._id);
    const input = {
      origen: { lat: -34.9, lng: -56.1 },
      destino: { lat: -34.9, lng: -54.9 },
      destinoNombre: "Punta del Este",
      distanciaKm: 120,
      duracionEstimadaMin: 180,
    };

    const started = await iniciarTrayecto(input, userId);
    expect(started).toMatchObject({
      origenNombre: "Punto A",
      destinoNombre: "Punta del Este",
      origen: input.origen,
      destino: input.destino,
      distanciaKm: 120,
      duracionEstimadaMin: 180,
      estado: EstadoTrayecto.EN_CURSO,
    });
    expect(await TrayectoModel.findById(started.id).lean()).toMatchObject({
      destinoLatitud: input.destino.lat,
      destinoLongitud: input.destino.lng,
      distanciaKm: 120,
      duracionEstimadaMin: 180,
    });
    await expect(obtenerTrayectoEnCurso(userId)).resolves.toEqual(started);
    await expect(iniciarTrayecto(input, userId)).rejects.toBeInstanceOf(TrayectoEnCursoExistenteError);

    await expect(finalizarTrayecto(started.id, userId)).resolves.toMatchObject({
      id: started.id,
      estado: EstadoTrayecto.FINALIZADO,
    });
    await expect(obtenerTrayectoEnCurso(userId)).resolves.toBeNull();
  });
});
