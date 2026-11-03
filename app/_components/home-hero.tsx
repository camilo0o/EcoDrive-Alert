import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { RoadSign } from "@/components/brand/road-sign";
import { buttonStyles } from "@/components/ui/button";

export function HomeHero() {
  return (
    <section aria-labelledby="hero-title" className="grid items-center gap-10 py-12 md:py-16 lg:grid-cols-2 lg:gap-16 lg:py-24">
      <div>
        <p className="inline-flex items-center gap-2.5 text-sm font-semibold text-brand-accent sm:text-base">
          <span aria-hidden="true" className="size-2 rounded-full bg-brand-soft shadow-[0_0_0_4px_rgba(100,168,133,.18)]" />
          Cuidamos a quienes comparten la ruta
        </p>
        <h1 className="mt-5 text-5xl font-bold leading-[1.02] tracking-[-0.045em] text-brand-strong sm:text-6xl lg:text-7xl" id="hero-title">
          Fauna en Ruta
        </h1>
        <p className="mt-6 max-w-xl text-xl font-medium leading-snug text-brand sm:text-2xl">
          Detección, reporte y prevención de fauna silvestre en las rutas de Uruguay.
        </p>
        <p className="mt-4 max-w-lg text-base leading-relaxed text-muted sm:text-lg">
          Una comunidad que comparte avistamientos para ayudar a que cada viaje sea más seguro
          para las personas y los animales.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link className={buttonStyles({ size: "lg" })} href="/register">
            Comenzar ahora <ArrowRight aria-hidden="true" size={18} />
          </Link>
          <Link className={buttonStyles({ variant: "secondary", size: "lg" })} href="/login">
            Ya tengo una cuenta
          </Link>
        </div>
        <p className="mt-6 flex items-center gap-2.5 text-sm text-muted">
          <span aria-hidden="true" className="grid size-5 shrink-0 place-items-center rounded-full bg-brand-tint text-brand">
            <Check size={13} strokeWidth={3} />
          </span>
          Reportes comunitarios para viajar con más información.
        </p>
      </div>
      <RoadSign className="min-h-80 sm:min-h-96 lg:min-h-[28rem]" />
    </section>
  );
}
