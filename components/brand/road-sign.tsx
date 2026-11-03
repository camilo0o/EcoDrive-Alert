import { PawPrint } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/** Señal de "animales en la ruta" sobre un panel con la línea punteada de una ruta. */
export function RoadSign({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("relative grid place-items-center overflow-hidden rounded-3xl bg-brand-tint", className)}
    >
      <div className="grid size-40 rotate-45 place-items-center rounded-3xl border-[7px] border-brand-deep bg-warning-map shadow-[0_24px_50px_rgba(19,44,39,.22)] sm:size-52">
        <PawPrint className="-rotate-45 text-brand-deep" size={84} strokeWidth={2.2} />
      </div>
      <div className="absolute inset-x-0 bottom-10 h-1.5 bg-[repeating-linear-gradient(90deg,#fff_0_44px,transparent_44px_80px)] opacity-80" />
    </div>
  );
}
