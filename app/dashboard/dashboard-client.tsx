"use client";

import { useCallback, useState } from "react";
import { DashboardHeader } from "./_components/dashboard-header";
import { DashboardIntro } from "./_components/dashboard-intro";
import { ReportModal } from "./_components/report-modal";
import { SightingDetailModal } from "./_components/sighting-detail-modal";
import { SightingsPanel } from "./_components/sightings-panel";
import { StatsGrid } from "./_components/stats-grid";
import { TrayectoPanel } from "./_components/trayecto-panel";
import { useDashboardData } from "./hooks/use-dashboard-data";
import { useDeviceLocation } from "./hooks/use-device-location";
import { fetchSighting } from "./lib/api";
import type { DashboardInitialData, DashboardSighting, LatLng, NavigationMapState } from "./types";

export type { DashboardInitialData, DashboardRoute, DashboardSighting, DashboardSpecies } from "./types";

const EMPTY_NAVIGATION: NavigationMapState = {
  origin: null,
  destination: null,
  route: null,
  selectionMode: null,
  currentLocation: null,
  followUser: false,
};

type DashboardClientProps = {
  userName: string;
  initialData: DashboardInitialData;
};

/** Orquesta el panel: conecta el estado con las secciones y los modales. */
export default function DashboardClient({ userName, initialData }: DashboardClientProps) {
  const dashboard = useDashboardData(initialData);
  const device = useDeviceLocation();
  const [navigation, setNavigation] = useState<NavigationMapState>(EMPTY_NAVIGATION);
  const [trayectoPanelKey, setTrayectoPanelKey] = useState(0);
  const [reportOpen, setReportOpen] = useState(false);
  const [detail, setDetail] = useState<{ sighting: DashboardSighting | null; loading: boolean } | null>(null);

  const selectNavigationPoint = useCallback((point: LatLng) => {
    setNavigation((current) => {
      if (current.selectionMode === "origin") {
        return { ...current, origin: point, route: null, selectionMode: null, followUser: false };
      }
      if (current.selectionMode === "destination") {
        return { ...current, destination: point, route: null, selectionMode: null, followUser: false };
      }
      return current;
    });
  }, []);

  function resetUserState() {
    device.clearLocation();
    setNavigation(EMPTY_NAVIGATION);
    setTrayectoPanelKey((current) => current + 1);
    setReportOpen(false);
    setDetail(null);
  }

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
      <DashboardHeader onLoggedOut={resetUserState} userName={userName} />

      <main className="grid gap-8 pt-10">
        <DashboardIntro onReport={() => setReportOpen(true)} />
        <TrayectoPanel key={trayectoPanelKey} navigation={navigation} onNavigationChange={setNavigation} />
        <StatsGrid loading={dashboard.loading} stats={dashboard.stats} />
        <SightingsPanel
          data={dashboard.data}
          device={device}
          navigation={navigation}
          error={dashboard.error}
          filters={dashboard.filters}
          loading={dashboard.loading}
          onFiltersChange={dashboard.updateFilters}
          onShowDetails={(id) => void showDetails(id)}
          onMapPointSelect={selectNavigationPoint}
        />
      </main>

      <footer className="mt-8 border-t border-brand/10 py-6 text-sm text-muted">
        Los avistamientos son aportes de la comunidad.
      </footer>

      {reportOpen && (
        <ReportModal
          onClose={() => setReportOpen(false)}
          onCreated={() => void dashboard.reload()}
          errorRutaKm={dashboard.data.errorRutaKm}
          routes={dashboard.data.rutas}
          rutaKmDisponible={dashboard.data.rutaKmDisponible}
        />
      )}

      {detail && (
        <SightingDetailModal loading={detail.loading} onClose={() => setDetail(null)} sighting={detail.sighting} />
      )}
    </div>
  );
}
