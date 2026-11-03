import { cn } from "@/lib/utils/cn";
import type { DashboardRoute, DashboardSighting } from "../types";
import { SightingCard } from "./sighting-card";

type SightingListProps = {
  sightings: DashboardSighting[];
  routes: DashboardRoute[];
  loading: boolean;
  layout: "column" | "grid";
  onShowDetails: (id: string) => void;
};

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-48 content-center justify-items-center gap-2 rounded-xl bg-surface p-6 text-center">
      {children}
    </div>
  );
}

export function SightingList({ sightings, routes, loading, layout, onShowDetails }: SightingListProps) {
  if (loading) {
    return (
      <EmptyState>
        <p className="text-base text-muted" role="status">Cargando rutas y avistamientos…</p>
      </EmptyState>
    );
  }

  if (sightings.length === 0) {
    return (
      <EmptyState>
        <strong className="text-base font-semibold text-brand">Aún no hay reportes para mostrar</strong>
        <p className="text-sm text-muted">Prueba con otros filtros o comparte el primer avistamiento.</p>
      </EmptyState>
    );
  }

  return (
    <div
      aria-label="Lista de reportes"
      className={cn(
        "grid content-start gap-3",
        layout === "column" ? "max-h-[28rem] overflow-y-auto pr-1" : "md:grid-cols-2 lg:grid-cols-3",
      )}
    >
      {sightings.map((sighting) => (
        <SightingCard key={sighting.id} onShowDetails={onShowDetails} routes={routes} sighting={sighting} />
      ))}
    </div>
  );
}
