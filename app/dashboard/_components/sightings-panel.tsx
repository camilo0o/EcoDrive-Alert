"use client";

import { useState } from "react";
import { FormMessage } from "@/components/ui/form-message";
import type { DeviceLocation } from "../hooks/use-device-location";
import type {
  DashboardInitialData,
  DashboardView,
  LatLng,
  NavigationMapState,
  SightingFilters as Filters,
} from "../types";
import { MapPanel } from "./map-panel";
import { SightingFilters } from "./sighting-filters";
import { SightingList } from "./sighting-list";
import { ViewToggle } from "./view-toggle";

type SightingsPanelProps = {
  data: DashboardInitialData;
  filters: Filters;
  loading: boolean;
  error: string;
  /** Ubicación temporal del dispositivo, visible solo en el mapa de esta sesión. */
  device: DeviceLocation;
  navigation: NavigationMapState;
  onFiltersChange: (patch: Partial<Filters>) => void;
  onShowDetails: (id: string) => void;
  onMapPointSelect: (point: LatLng) => void;
};

export function SightingsPanel(props: SightingsPanelProps) {
  const { data, filters, loading, error, device, navigation, onFiltersChange, onShowDetails, onMapPointSelect } = props;
  const [view, setView] = useState<DashboardView>("map");

  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-[0_10px_35px_rgba(29,66,54,.035)] sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold tracking-tight text-brand-strong">Avistamientos cerca de las rutas</h2>
        <ViewToggle onChange={setView} value={view} />
      </div>

      <div className="mt-6">
        <SightingFilters
          filters={filters}
          loading={loading}
          onChange={onFiltersChange}
          routes={data.rutas}
          species={data.especies}
          total={data.total}
        />
      </div>

      {error && <FormMessage className="mt-4">{error}</FormMessage>}

      <div className={view === "map" ? "mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,1fr)]" : "mt-6"}>
        {view === "map" && (
          <MapPanel
            locating={device.loading}
            locationError={device.error}
            onLocate={() => void device.locate()}
            navigation={navigation}
            onMapPointSelect={onMapPointSelect}
            routes={data.rutas}
            sightings={data.avistamientos}
            userLocation={device.location}
          />
        )}
        <SightingList
          layout={view === "map" ? "column" : "grid"}
          loading={loading}
          onShowDetails={onShowDetails}
          routes={data.rutas}
          sightings={data.avistamientos}
        />
      </div>
    </section>
  );
}
