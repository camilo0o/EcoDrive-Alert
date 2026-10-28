import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth/session";
import { getUserById } from "@/lib/services/auth.service";
import { EstadoAvistamiento } from "@/lib/enums";
import { listarAvistamientos } from "@/lib/services/avistamiento.service";
import { buscarEspecies } from "@/lib/services/especie.service";
import { listarRutas } from "@/lib/services/ruta.service";
import DashboardClient, { type DashboardInitialData } from "./dashboard-client";

export default function DashboardPage() {
    return (
        <main className="dashboard-shell">
            <Suspense fallback={<p className="dashboard-loading">Cargando tu espacio...</p>}>
                <DashboardContent />
            </Suspense>
        </main>
    );
}

async function DashboardContent() {
    const userId = await getSessionUserId();

    if (!userId) {
        redirect("/login");
    }

    const user = await getUserById(userId);

    if (!user) {
        redirect("/login");
    }

    const [rutas, especies, sightings] = await Promise.all([
        listarRutas(),
        buscarEspecies(),
        listarAvistamientos(
            { estado: EstadoAvistamiento.ACTIVO, limit: 100, page: 1 },
            userId,
        ),
    ]);
    const initialData: DashboardInitialData = {
        rutas,
        especies,
        avistamientos: sightings.items.map((sighting) => ({
            ...sighting,
            fechaHora: sighting.fechaHora.toISOString(),
        })),
        total: sightings.total,
    };

    return <DashboardClient initialData={initialData} userName={user.nombre} />;
}