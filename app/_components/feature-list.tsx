import { ClipboardPlus, MapPin, PawPrint } from "lucide-react";

const features = [
  {
    title: "Mapa de avistamientos",
    description: "Consulta reportes recientes y ubica los puntos de riesgo en las rutas.",
    icon: MapPin,
    iconStyle: "bg-brand-tint text-brand",
  },
  {
    title: "Reportes manuales",
    description: "Comparte un avistamiento para que otros conductores puedan prevenirse.",
    icon: ClipboardPlus,
    iconStyle: "bg-danger-tint text-danger-soft",
  },
  {
    title: "Fauna de Uruguay",
    description: "Explora especies, niveles de riesgo y rutas disponibles.",
    icon: PawPrint,
    iconStyle: "bg-warning-tint text-warning",
  },
];

export function FeatureList() {
  return (
    <section aria-labelledby="features-title" className="pb-16 pt-4 md:pb-24">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-8">
        <h2 className="max-w-xl text-3xl font-bold leading-tight tracking-[-0.03em] text-brand-strong sm:text-4xl" id="features-title">
          Información que te acompaña en el camino
        </h2>
        <p className="max-w-xs text-base leading-relaxed text-muted">
          Reporta, consulta y mantente atento a la fauna silvestre.
        </p>
      </div>
      <div className="mt-10 grid gap-8 md:grid-cols-3 md:gap-10">
        {features.map((feature) => (
          <article className="border-t border-line pt-6" key={feature.title}>
            <span aria-hidden="true" className={`grid size-11 place-items-center rounded-xl ${feature.iconStyle}`}>
              <feature.icon size={22} strokeWidth={1.8} />
            </span>
            <h3 className="mt-5 text-lg font-semibold tracking-tight text-brand-strong sm:text-xl">{feature.title}</h3>
            <p className="mt-2 max-w-sm text-base leading-relaxed text-muted">{feature.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
