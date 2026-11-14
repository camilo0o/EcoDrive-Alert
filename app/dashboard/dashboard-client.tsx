"use client";

import { useCallback, useState } from "react";
import { DashboardHeader } from "./_components/dashboard-header";
import { DashboardIntro } from "./_components/dashboard-intro";
import { MapPanel } from "./_components/map-panel";
import { ReportModal } from "./_components/report-modal";
import { SightingDetailModal } from "./_components/sighting-detail-modal";
import { SightingsPanel } from "./_components/sightings-panel";
import { StatsGrid } from "./_components/stats-grid";
import { TrayectoPanel } from "./_components/trayecto-panel";
import { useDashboardData } from "./hooks/use-dashboard-data";
import { useDeviceLocation } from "./hooks/use-device-location";
import { fetchSighting } from "./lib/api";
import type { DashboardInitialData, DashboardSighting, DashboardView, LatLng, NavigationMapState } from "./types";

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
  const [view, setView] = useState<DashboardView>("map");
  const [trayectoPanelKey, setTrayectoPanelKey] = useState(0);
  const [reportOpen, setReportOpen] = useState(false);
  const [detail, setDetail] = useState<{ sighting: DashboardSighting | null; loading: boolean } | null>(null);

  const selectNavigationPoint = useCallback((point: LatLng) => {
    setNavigation((current) => {
      if (current.selectionMode === "destination") {
        return { ...current, destination: point, route: null, selectionMode: null, followUser: false };
      }
      return current;
    });
  }, []);

  function resetUserState() {
    device.clearLocation();
    setNavigation(EMPTY_NAVIGATION);
    setView("map");
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
    <div className="relative isolate h-dvh min-h-[36rem] w-full overflow-hidden bg-surface">
      <MapPanel
        fullScreen
        locating={device.loading}
        locationError={device.error}
        navigation={navigation}
        onLocate={() => void device.locate()}
        onMapPointSelect={selectNavigationPoint}
        routes={dashboard.data.rutas}
        sightings={dashboard.data.avistamientos}
        userLocation={device.location}
      />

      <main className="pointer-events-none absolute inset-0 z-[1100]">
        <div className="pointer-events-auto absolute inset-x-2 top-2 sm:inset-x-4 sm:top-3">
          <DashboardHeader onLoggedOut={resetUserState} userName={userName} />
        </div>

        <div className="pointer-events-none absolute inset-x-2 bottom-[4.5rem] top-[4.75rem] z-[1090] flex flex-col gap-2 overflow-hidden sm:bottom-4 sm:left-4 sm:right-auto sm:top-24 sm:w-[min(30rem,calc(100vw-2rem))]">
          <DashboardIntro compact={view === "route"} onReport={() => setReportOpen(true)} />
          {view !== "route" && (
            <div className={`pointer-events-none ${view === "reports" ? "hidden sm:block" : ""}`}>
              <StatsGrid loading={dashboard.loading} stats={dashboard.stats} />
            </div>
          )}
          <div hidden={view !== "route"} className="pointer-events-auto min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <TrayectoPanel key={trayectoPanelKey} navigation={navigation} onNavigationChange={setNavigation} />
          </div>
        </div>

        <SightingsPanel
          data={dashboard.data}
          error={dashboard.error}
          filters={dashboard.filters}
          loading={dashboard.loading}
          onFiltersChange={dashboard.updateFilters}
          onShowDetails={(id) => void showDetails(id)}
          onViewChange={setView}
          view={view}
        />
      </main>

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
