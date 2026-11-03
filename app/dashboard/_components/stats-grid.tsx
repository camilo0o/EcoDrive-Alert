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
    <article className="flex items-start gap-4 rounded-2xl border border-line bg-white p-5">
      <span aria-hidden="true" className={`grid size-10 shrink-0 place-items-center rounded-xl ${stat.iconStyle}`}>
        <Icon size={20} />
      </span>
      <div>
        <p className="text-sm font-medium text-muted">{stat.label}</p>
        <p className="mt-1 text-3xl font-bold tracking-tight text-brand-strong">{loading ? "—" : stat.value}</p>
        <p className="mt-1 text-sm text-subtle">{stat.note}</p>
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
    <section aria-label="Resumen de avistamientos" className="grid gap-3 sm:grid-cols-3 sm:gap-4">
      {items.map((stat) => <StatCard key={stat.label} loading={loading} stat={stat} />)}
    </section>
  );
}
