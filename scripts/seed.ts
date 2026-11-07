/**
 * Seed de datos de prueba.
 * Uso:  npx tsx scripts/seed.ts
 * Requiere MONGODB_URI (se lee de .env.local o .env si existen).
 * Es idempotente: se puede correr varias veces sin duplicar datos.
 * Los avistamientos de ejemplo se ubican en las progresivas oficiales del MTOP.
 */
import bcrypt from "bcryptjs";
import { Types } from "mongoose";
import { connectDB, disconnectDB } from "../lib/db/mongodb";
import UsuarioModel from "../lib/models/Usuario";
import EspecieModel from "../lib/models/Especie";
import RutaModel from "../lib/models/Ruta";
import AvistamientoModel from "../lib/models/Avistamiento";
import { EstadoAvistamiento, MetodoReporte, NivelRiesgo } from "../lib/enums";
import { obtenerCoordenadaRutaKm } from "../lib/services/mtop-rutas.service";

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

const SEED_EMAIL = process.env.SEED_USER_EMAIL;
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
    { nombre: "Ruta 1", longitudKm: 177, codigoMtop: "1" },
    { nombre: "Ruta 3", longitudKm: 390, codigoMtop: "3" },
    { nombre: "Ruta 5", longitudKm: 509, codigoMtop: "5" },
    { nombre: "Ruta 8", longitudKm: 391, codigoMtop: "8" },
    { nombre: "Ruta 9", longitudKm: 340, codigoMtop: "9" },
];

const avistamientos = [
    { especie: "Carpincho", ruta: "Ruta 5", km: 65, anonimo: false, horasAtras: 1, descripcion: "Grupo de carpinchos cerca de la ruta." },
    { especie: "Zorro de monte", ruta: "Ruta 3", km: 70, anonimo: true, horasAtras: 3, descripcion: "Un zorro cruzó la calzada." },
    { especie: "Ciervo axis", ruta: "Ruta 8", km: 35, anonimo: false, horasAtras: 2, descripcion: "Ciervo observado junto a la banquina." },
    { especie: "Mulita", ruta: "Ruta 9", km: 70, anonimo: true, horasAtras: 5, descripcion: "Una mulita entre la vegetación al costado de la ruta." },
    { especie: "Jabalí", ruta: "Ruta 1", km: 167, anonimo: false, horasAtras: 8, descripcion: "Jabalí observado cruzando la ruta." },
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
        const doc = await RutaModel.findOneAndUpdate(
            { codigoMtop: r.codigoMtop },
            { $set: r },
            { new: true },
        ) ?? await RutaModel.findOneAndUpdate(
                { nombre: r.nombre },
                { $set: r },
                { upsert: true, new: true },
            );
        if (!doc) throw new Error(`No se pudo crear ${r.nombre} en el seed.`);
        rutaIds.set(r.nombre, doc._id);
    }

    const avistamientosConUbicacion = await Promise.all(
        avistamientos.map(async (avistamiento) => {
            const ruta = rutas.find((item) => item.nombre === avistamiento.ruta);
            if (!ruta) throw new Error(`No se encontró la ruta ${avistamiento.ruta} del seed.`);
            const especieId = especieIds.get(avistamiento.especie);
            const rutaId = rutaIds.get(avistamiento.ruta);
            if (!especieId || !rutaId) {
                throw new Error(`Faltan datos relacionados para el avistamiento de ${avistamiento.especie}.`);
            }

            return {
                usuarioId: usuario._id,
                especieId,
                rutaId,
                fechaHora: new Date(Date.now() - avistamiento.horasAtras * 3600_000),
                ubicacion: {
                    type: "Point" as const,
                    coordinates: await obtenerCoordenadaRutaKm(ruta.codigoMtop, avistamiento.km),
                },
                km: avistamiento.km,
                descripcion: avistamiento.descripcion,
                metodo: MetodoReporte.MANUAL,
                esAnonimo: avistamiento.anonimo,
                estado: EstadoAvistamiento.ACTIVO,
            };
        }),
    );

    // Resolver las ubicaciones antes de reemplazar los reportes del usuario demo.
    await AvistamientoModel.deleteMany({ usuarioId: usuario._id });
    await AvistamientoModel.insertMany(avistamientosConUbicacion);

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