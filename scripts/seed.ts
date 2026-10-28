/**
 * Seed de datos de prueba.
 * Uso:  npx tsx scripts/seed.ts
 * Requiere MONGODB_URI (se lee de .env.local o .env si existen).
 * Es idempotente: se puede correr varias veces sin duplicar datos.
 * Las coordenadas son aproximadas y sirven solo para probar.
 */
import bcrypt from "bcryptjs";
import { Types } from "mongoose";
import { connectDB, disconnectDB } from "../lib/db/mongodb";
import UsuarioModel from "../lib/models/Usuario";
import EspecieModel from "../lib/models/Especie";
import RutaModel from "../lib/models/Ruta";
import AvistamientoModel from "../lib/models/Avistamiento";
import { EstadoAvistamiento, MetodoReporte, NivelRiesgo } from "../lib/enums";

for (const file of [".env.local", ".env"]) {
    try {
        process.loadEnvFile(file);
    } catch {
        /* el archivo no existe, se ignora */
    }
}

if (process.env.NODE_ENV === "production") {
    console.error("El seed no se puede ejecutar con NODE_ENV=production.");
    process.exit(1);
}

const SEED_EMAIL = "demo@ecodrive.test";
const SEED_PASSWORD = process.env.SEED_USER_PASSWORD ?? "demo12345678";

const especies = [
    { nombre: "Carpincho", alias: ["Capibara"], nivelRiesgo: NivelRiesgo.ALTO },
    { nombre: "Ciervo axis", alias: ["Axis", "Ciervo"], nivelRiesgo: NivelRiesgo.ALTO },
    { nombre: "Jabalí", alias: ["Chancho salvaje"], nivelRiesgo: NivelRiesgo.ALTO },
    { nombre: "Zorro de monte", alias: ["Zorro"], nivelRiesgo: NivelRiesgo.MEDIO },
    { nombre: "Zorro gris", alias: ["Zorro pampeano"], nivelRiesgo: NivelRiesgo.MEDIO },
    { nombre: "Nutria", alias: ["Coipo"], nivelRiesgo: NivelRiesgo.MEDIO },
    { nombre: "Mulita", alias: ["Tatú", "Armadillo"], nivelRiesgo: NivelRiesgo.BAJO },
    { nombre: "Zorrillo", alias: ["Mofeta"], nivelRiesgo: NivelRiesgo.BAJO },
    { nombre: "Tero", alias: ["Tero común"], nivelRiesgo: NivelRiesgo.BAJO },
];

const rutas = [
    { nombre: "Ruta 1", longitudKm: 177 },
    { nombre: "Ruta 3", longitudKm: 390 },
    { nombre: "Ruta 5", longitudKm: 509 },
    { nombre: "Ruta 8", longitudKm: 391 },
    { nombre: "Ruta 9", longitudKm: 340 },
];

// [longitud, latitud] — formato GeoJSON
const avistamientos = [
    { especie: "Carpincho", ruta: "Ruta 1", km: 98, coords: [-57.35, -34.31], metodo: MetodoReporte.MANUAL, anonimo: false, horasAtras: 1, descripcion: "Grupo de tres cruzando cerca del arroyo" },
    { especie: "Zorro de monte", ruta: "Ruta 1", km: 45, coords: [-56.62, -34.63], metodo: MetodoReporte.MANUAL, anonimo: true, horasAtras: 3, descripcion: null },
    { especie: "Zorro gris", ruta: "Ruta 3", km: 56, coords: [-56.71, -34.34], metodo: MetodoReporte.MANUAL, anonimo: false, horasAtras: 2, descripcion: "Sobre la banquina" },
    { especie: "Ciervo axis", ruta: "Ruta 5", km: 62, coords: [-56.21, -34.10], metodo: MetodoReporte.AUTOMATICO, anonimo: false, horasAtras: 0.5, descripcion: "Detectado por cámara", confianza: 0.87 },
    { especie: "Carpincho", ruta: "Ruta 5", km: 190, coords: [-56.52, -33.38], metodo: MetodoReporte.MANUAL, anonimo: false, horasAtras: 5, descripcion: "Cruzando de noche" },
    { especie: "Mulita", ruta: "Ruta 5", km: 35, coords: [-56.28, -34.54], metodo: MetodoReporte.MANUAL, anonimo: true, horasAtras: 8, descripcion: null },
    { especie: "Jabalí", ruta: "Ruta 8", km: 110, coords: [-55.4, -34.38], metodo: MetodoReporte.MANUAL, anonimo: false, horasAtras: 4, descripcion: "Dos adultos" },
    { especie: "Nutria", ruta: "Ruta 9", km: 215, coords: [-54.33, -34.48], metodo: MetodoReporte.AUDIO, anonimo: false, horasAtras: 6, descripcion: null, transcripcion: "Vi una nutria cruzando la ruta" },
    // Expirado: sirve para probar el filtro por estado
    { especie: "Tero", ruta: "Ruta 5", km: 70, coords: [-56.2, -34.0], metodo: MetodoReporte.MANUAL, anonimo: false, horasAtras: 72, descripcion: "Avistamiento viejo", estado: EstadoAvistamiento.EXPIRADO },
] as const;

async function main() {
    await connectDB();

    const usuario = await UsuarioModel.findOneAndUpdate(
        { email: SEED_EMAIL },
        {
            $set: {
                nombre: "Usuario Demo",
                contraseniaHash: await bcrypt.hash(SEED_PASSWORD, 12),
            },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    const especieIds = new Map<string, Types.ObjectId>();
    for (const e of especies) {
        const doc = await EspecieModel.findOneAndUpdate({ nombre: e.nombre }, { $set: e }, { upsert: true, new: true });
        especieIds.set(e.nombre, doc._id);
    }

    const rutaIds = new Map<string, Types.ObjectId>();
    for (const r of rutas) {
        const doc = await RutaModel.findOneAndUpdate({ nombre: r.nombre }, { $set: r }, { upsert: true, new: true });
        rutaIds.set(r.nombre, doc._id);
    }

    // Se recrean solo los avistamientos del usuario demo.
    await AvistamientoModel.deleteMany({ usuarioId: usuario._id });
    await AvistamientoModel.insertMany(
        avistamientos.map((a) => ({
            usuarioId: usuario._id,
            especieId: especieIds.get(a.especie),
            rutaId: rutaIds.get(a.ruta),
            fechaHora: new Date(Date.now() - a.horasAtras * 3600_000),
            ubicacion: { type: "Point", coordinates: [...a.coords] },
            km: a.km,
            descripcion: a.descripcion ?? undefined,
            transcripcion: "transcripcion" in a ? a.transcripcion : undefined,
            metodo: a.metodo,
            confianza: "confianza" in a ? a.confianza : undefined,
            esAnonimo: a.anonimo,
            estado: "estado" in a ? a.estado : EstadoAvistamiento.ACTIVO,
        })),
    );

    await AvistamientoModel.syncIndexes();

    console.log(
        `Seed listo: ${especies.length} especies, ${rutas.length} rutas, ${avistamientos.length} avistamientos.`,
    );
    console.log(`Usuario de prueba: ${SEED_EMAIL} / ${SEED_PASSWORD}`);
}

main()
    .catch((error) => {
        console.error("Error en el seed:", error);
        process.exitCode = 1;
    })
    .finally(disconnectDB);