"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { focusRing } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { DashboardHeader } from "./_components/dashboard-header";
import { DashboardIntro } from "./_components/dashboard-intro";
import { ReportModal } from "./_components/report-modal";
import { SightingDetailModal } from "./_components/sighting-detail-modal";
import { SightingsPanel } from "./_components/sightings-panel";
import { StatsGrid } from "./_components/stats-grid";
import { useDashboardData } from "./hooks/use-dashboard-data";
import { useDeviceLocation } from "./hooks/use-device-location";
import { fetchSighting } from "./lib/api";
import type { DashboardInitialData, DashboardSighting } from "./types";

export type { DashboardInitialData, DashboardRoute, DashboardSighting, DashboardSpecies } from "./types";

type DashboardClientProps = {
  userName: string;
  initialData: DashboardInitialData;
};

/** Orquesta el panel: conecta el estado con las secciones y los modales. */
export default function DashboardClient({ userName, initialData }: DashboardClientProps) {
  const dashboard = useDashboardData(initialData);
  const device = useDeviceLocation();
  const [reportOpen, setReportOpen] = useState(false);
  const [detail, setDetail] = useState<{ sighting: DashboardSighting | null; loading: boolean } | null>(null);

  async function showDetails(id: string) {
    setDetail({ sighting: null, loading: true });
    try {
      setDetail({ sighting: await fetchSighting(id), loading: false });
    } catch (detailError) {
      console.error("Error cargando el detalle:", detailError);
      setDetail(null);
      dashboard.setError(detailError instanceof Error ? detailError.message : "No se pudo cargar el detalle.");
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-5 pb-8 sm:px-8">
      <DashboardHeader onLoggedOut={device.clearLocation} userName={userName} />

      <main className="grid gap-8 pt-10">
        <DashboardIntro onReport={() => setReportOpen(true)} />
        <StatsGrid loading={dashboard.loading} stats={dashboard.stats} />
        <SightingsPanel
          data={dashboard.data}
          device={device}
          error={dashboard.error}
          filters={dashboard.filters}
          loading={dashboard.loading}
          onFiltersChange={dashboard.updateFilters}
          onShowDetails={(id) => void showDetails(id)}
        />
      </main>

      <footer className="mt-8 flex flex-col gap-3 border-t border-brand/10 py-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <span>Los avistamientos son aportes de la comunidad.</span>
        <Link
          className={cn("inline-flex items-center gap-1.5 rounded text-base font-semibold text-brand underline-offset-4 hover:underline", focusRing)}
          href="/"
        >
          Volver al inicio <ArrowRight aria-hidden="true" size={16} />
        </Link>
      </footer>

      {reportOpen && (
        <ReportModal
          onClose={() => setReportOpen(false)}
          onCreated={() => void dashboard.reload()}
          routes={dashboard.data.rutas}
          species={dashboard.data.especies}
        />
      )}

      {detail && (
        <SightingDetailModal loading={detail.loading} onClose={() => setDetail(null)} sighting={detail.sighting} />
      )}
    </div>
  );
}
