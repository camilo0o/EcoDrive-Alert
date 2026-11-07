import { Field, Select } from "@/components/ui/field";
import { pluralizeReports } from "../lib/format";
import type { DashboardRoute, DashboardSpecies, SightingFilters as Filters } from "../types";

type SightingFiltersProps = {
  filters: Filters;
  routes: DashboardRoute[];
  species: DashboardSpecies[];
  total: number;
  loading: boolean;
  onChange: (patch: Partial<Filters>) => void;
};

export function SightingFilters({ filters, routes, species, total, loading, onChange }: SightingFiltersProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
      <Field className="sm:w-56" label="Filtrar por ruta">
        <Select onChange={(event) => onChange({ routeId: event.target.value })} value={filters.routeId}>
          <option value="">Todas las rutas</option>
          {routes.map((route) => <option key={route.id} value={route.id}>{route.nombre}</option>)}
        </Select>
      </Field>
      <Field className="sm:w-56" label="Filtrar por especie">
        <Select onChange={(event) => onChange({ speciesId: event.target.value })} value={filters.speciesId}>
          <option value="">Todas las especies</option>
          {species.map((item) => (
            <option key={item.id} value={item.id}>
              {item.nombre}{item.nombreCientifico ? ` (${item.nombreCientifico})` : ""}
            </option>
          ))}
        </Select>
      </Field>
      <span aria-live="polite" className="text-sm text-subtle sm:mb-3 sm:ml-auto">
        {loading ? "Actualizando…" : pluralizeReports(total)}
      </span>
    </div>
  );
}
