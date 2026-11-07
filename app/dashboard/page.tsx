import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getUserBySession } from "@/lib/services/auth.service";
import { EstadoAvistamiento } from "@/lib/enums";
import { listarAvistamientos } from "@/lib/services/avistamiento.service";
import { buscarEspecies } from "@/lib/services/especie.service";
import { listarRutas } from "@/lib/services/ruta.service";
import DashboardClient from "./dashboard-client";
import type { DashboardInitialData } from "./types";

export default function DashboardPage() {
  // div y no main: DashboardClient ya tiene su propio <main>.
  return (
    <div className="min-h-screen">
      <Suspense fallback={<p className="py-12 text-center text-base text-muted">Cargando tu espacio…</p>}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}

async function DashboardContent() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await getUserBySession(session);
  if (!user) redirect("/login");

  const [rutasResult, especies, sightings] = await Promise.all([
    listarRutas(),
    buscarEspecies(),
    listarAvistamientos({ estado: EstadoAvistamiento.ACTIVO, limit: 100, page: 1 }, session.userId),
  ]);

  const initialData: DashboardInitialData = {
    ...rutasResult,
    especies,
    avistamientos: sightings.items.map((sighting) => ({
      ...sighting,
      fechaHora: sighting.fechaHora.toISOString(),
    })),
    total: sightings.total,
  };

  return <DashboardClient initialData={initialData} userName={user.nombre} />;
}
