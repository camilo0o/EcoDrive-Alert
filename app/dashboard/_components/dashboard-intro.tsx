import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DashboardIntro({ onReport }: { onReport: () => void }) {
  return (
    <section className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="inline-flex items-center gap-2.5 text-sm font-semibold text-brand-accent sm:text-base">
          <span aria-hidden="true" className="size-2 rounded-full bg-brand-soft shadow-[0_0_0_4px_rgba(100,168,133,.18)]" />
          Comunidad en ruta
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-brand-strong sm:text-4xl">
          Conduce con más información.
        </h1>
        <p className="mt-2 text-base text-muted sm:text-lg">
          Consulta avistamientos recientes o reporta fauna silvestre en tu camino.
        </p>
      </div>
      <Button className="w-full sm:w-auto" onClick={onReport} size="lg">
        <Plus aria-hidden="true" size={18} /> Reportar avistamiento
      </Button>
    </section>
  );
}
