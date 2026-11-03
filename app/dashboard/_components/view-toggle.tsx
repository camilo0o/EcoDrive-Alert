import { focusRing } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import type { DashboardView } from "../types";

const options: { value: DashboardView; label: string }[] = [
  { value: "map", label: "Mapa" },
  { value: "reports", label: "Reportes" },
];

type ViewToggleProps = {
  value: DashboardView;
  onChange: (view: DashboardView) => void;
};

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div aria-label="Vista de avistamientos" className="inline-flex gap-1 rounded-xl bg-surface-alt p-1" role="group">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            aria-pressed={active}
            className={cn(
              "h-9 rounded-lg px-4 text-sm font-semibold transition-colors",
              active ? "bg-white text-brand shadow-[0_2px_6px_rgba(28,63,53,.09)]" : "text-muted hover:text-brand",
              focusRing,
            )}
            key={option.value}
            onClick={() => onChange(option.value)}
            type="button"
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
