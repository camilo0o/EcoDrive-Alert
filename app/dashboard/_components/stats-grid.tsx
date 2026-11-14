import { AlertTriangle, MapPin, Route, type LucideIcon } from "lucide-react";

type Stat = {
  label: string;
  value: number;
  note: string;
  icon: LucideIcon;
  iconStyle: string;
};

function StatCard({ stat, loading }: { stat: Stat; loading: boolean }) {
  const Icon = stat.icon;
  return (
    <article className="flex min-w-0 items-center gap-2 rounded-xl border border-white/80 bg-white/90 px-2 py-2 shadow-lg backdrop-blur-md sm:gap-2.5 sm:px-3">
      <span aria-hidden="true" className={`grid size-7 shrink-0 place-items-center rounded-lg ${stat.iconStyle}`}>
        <Icon size={15} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[10px] font-medium leading-tight text-muted sm:text-xs">{stat.label}</p>
        <p className="text-base font-bold leading-tight tracking-tight text-brand-strong sm:text-lg">{loading ? "—" : stat.value}</p>
        <p className="sr-only">{stat.note}</p>
      </div>
    </article>
  );
}

type StatsGridProps = {
  stats: { total: number; highRisk: number; activeRoutes: number };
  loading: boolean;
};

export function StatsGrid({ stats, loading }: StatsGridProps) {
  const items: Stat[] = [
    { label: "Reportes activos", value: stats.total, note: "En las rutas de Uruguay", icon: MapPin, iconStyle: "bg-brand-tint text-brand" },
    { label: "Riesgo alto", value: stats.highRisk, note: "Avistamientos para tener en cuenta", icon: AlertTriangle, iconStyle: "bg-danger-tint text-danger-soft" },
    { label: "Rutas con actividad", value: stats.activeRoutes, note: "Con reportes visibles", icon: Route, iconStyle: "bg-warning-tint text-warning" },
  ];

  return (
    <section aria-label="Resumen de avistamientos" className="grid grid-cols-3 gap-1.5 sm:gap-2">
      {items.map((stat) => <StatCard key={stat.label} loading={loading} stat={stat} />)}
    </section>
  );
}
