"use client";

import { FormMessage } from "@/components/ui/form-message";
import type {
  DashboardInitialData,
  DashboardView,
  SightingFilters as Filters,
} from "../types";
import { SightingFilters } from "./sighting-filters";
import { SightingList } from "./sighting-list";
import { ViewToggle } from "./view-toggle";

type SightingsPanelProps = {
  data: DashboardInitialData;
  filters: Filters;
  loading: boolean;
  error: string;
  view: DashboardView;
  onViewChange: (view: DashboardView) => void;
  onFiltersChange: (patch: Partial<Filters>) => void;
  onShowDetails: (id: string) => void;
};

export function SightingsPanel({
  data,
  filters,
  loading,
  error,
  view,
  onViewChange,
  onFiltersChange,
  onShowDetails,
}: SightingsPanelProps) {
  return (
    <div className="pointer-events-auto absolute right-2 top-[4.75rem] z-[1100] flex w-fit flex-col items-end gap-2 sm:right-4 sm:top-24">
      <ViewToggle onChange={onViewChange} value={view} />

      {view === "reports" && (
        <section
          aria-label="Avistamientos cerca de las rutas"
          className="flex max-h-[calc(100dvh-11rem)] w-[min(27rem,calc(100vw-1rem))] flex-col overflow-hidden rounded-2xl border border-white/80 bg-white/95 p-3 shadow-xl backdrop-blur-md sm:p-4"
        >
          <h2 className="mb-3 text-lg font-bold text-brand-strong">Avistamientos cerca de las rutas</h2>
          <SightingFilters
            filters={filters}
            loading={loading}
            onChange={onFiltersChange}
            routes={data.rutas}
            species={data.especies}
            total={data.total}
          />
          {error && <FormMessage className="mt-3">{error}</FormMessage>}
          <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
            <SightingList
              layout="column"
              loading={loading}
              onShowDetails={onShowDetails}
              routes={data.rutas}
              sightings={data.avistamientos}
            />
          </div>
        </section>
      )}
    </div>
  );
}
