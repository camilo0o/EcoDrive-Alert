import { ArrowRight, MapPin } from "lucide-react";
import { focusRing } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { formatDate, sightingLocationLabel } from "../lib/format";
import type { DashboardRoute, DashboardSighting } from "../types";
import { RiskBadge } from "./risk-badge";

type SightingCardProps = {
  sighting: DashboardSighting;
  routes: DashboardRoute[];
  onShowDetails: (id: string) => void;
};

export function SightingCard({ sighting, routes, onShowDetails }: SightingCardProps) {
  return (
    <article className="rounded-xl border border-line bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <RiskBadge risk={sighting.especie?.nivelRiesgo} />
        <span className="text-sm text-subtle">{formatDate(sighting.fechaHora)}</span>
      </div>
      <h3 className="mt-3 text-lg font-semibold tracking-tight text-brand-strong">
        {sighting.especie?.nombre ?? "Especie no disponible"}
      </h3>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
        <MapPin aria-hidden="true" className="shrink-0 text-brand-accent" size={15} />
        <span>{sightingLocationLabel(sighting, routes)}</span>
      </p>
      {sighting.descripcion && <p className="mt-2 text-base leading-relaxed text-muted">{sighting.descripcion}</p>}
      <button
        className={cn("mt-3 inline-flex items-center gap-1.5 rounded text-sm font-semibold text-brand underline-offset-4 hover:text-brand-accent hover:underline", focusRing)}
        onClick={() => onShowDetails(sighting.id)}
        type="button"
      >
        Ver detalle <ArrowRight aria-hidden="true" size={15} />
      </button>
    </article>
  );
}
