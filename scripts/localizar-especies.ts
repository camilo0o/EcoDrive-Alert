import { connectDB, disconnectDB } from "../lib/db/mongodb";
import EspecieModel from "../lib/models/Especie";
import { obtenerTaxonINaturalist } from "../lib/services/inaturalist.service";

for (const file of [".env.local", ".env"]) {
    try {
        process.loadEnvFile(file);
    } catch {
        // El archivo es opcional; MONGODB_URI puede estar definido en el entorno.
    }
}

async function main() {
    await connectDB();
    const especies = await EspecieModel.find({ inaturalistTaxonId: { $exists: true } })
        .select("_id inaturalistTaxonId")
        .lean();

    let actualizadas = 0;
    for (const [index, especie] of especies.entries()) {
        if (!especie.inaturalistTaxonId) continue;

        const taxon = await obtenerTaxonINaturalist(especie.inaturalistTaxonId);
        const update = taxon.nombreComun
            ? { $set: { nombreComun: taxon.nombreComun } }
            : { $unset: { nombreComun: 1 } };
        await EspecieModel.updateOne({ _id: especie._id }, update);
        actualizadas += 1;
        console.log(`[${index + 1}/${especies.length}] ${taxon.nombreComun ?? taxon.nombreCientifico}`);

        if (index < especies.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 1_000));
        }
    }

    console.log(`Listo: ${actualizadas} especies actualizadas en español.`);
}

main()
    .catch((error) => {
        console.error("Error localizando los nombres de especies:", error);
        process.exitCode = 1;
    })
    .finally(disconnectDB);
