import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DashboardIntro({ onReport, compact = false }: { onReport: () => void; compact?: boolean }) {
  return (
    <section className="pointer-events-auto flex items-center justify-between gap-3 rounded-xl border border-white/80 bg-white/95 p-3 shadow-lg backdrop-blur-md sm:gap-4 sm:p-4">
      <div className="hidden min-w-0 flex-1 sm:block">
        {compact ? (
          <h1 className="text-base font-bold tracking-tight text-brand-strong">
            Conduce con más información.
          </h1>
        ) : (
          <>
            <p className="inline-flex items-center gap-2.5 text-sm font-semibold text-brand-accent sm:text-base">
              <span aria-hidden="true" className="size-2 rounded-full bg-brand-soft shadow-[0_0_0_4px_rgba(100,168,133,.18)]" />
              Comunidad en ruta
            </p>
            <h1 className="mt-1 text-lg font-bold tracking-tight text-brand-strong sm:text-xl">
              Conduce con más información.
            </h1>
            <p className="mt-1 text-xs text-muted sm:text-sm">
              Consulta avistamientos recientes o reporta fauna silvestre en tu camino.
            </p>
          </>
        )}
      </div>
      <Button aria-label="Reportar avistamiento" className="shrink-0" onClick={onReport} size="sm">
        <Plus aria-hidden="true" size={17} />
        <span>Reportar</span>
        <span className="hidden sm:inline">avistamiento</span>
      </Button>
    </section>
  );
}
