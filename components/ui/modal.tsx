"use client";

import { X } from "lucide-react";
import { useEffect, useId, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { focusRing } from "./button";

type ModalProps = {
  title: string;
  description?: string;
  closeLabel: string;
  onClose: () => void;
  size?: "md" | "lg";
  children: ReactNode;
};

export function Modal({ title, description, closeLabel, onClose, size = "md", children }: ModalProps) {
  const titleId = useId();

  // Cerrar con Escape, como cualquier diálogo.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[1100] grid place-items-center overflow-y-auto bg-brand-deep/50 p-4 backdrop-blur-sm sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        className={cn(
          "max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-white p-6 shadow-[0_25px_80px_rgba(12,39,34,.25)] sm:p-7",
          size === "lg" ? "max-w-xl" : "max-w-lg",
        )}
        role="dialog"
      >
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-brand-strong" id={titleId}>{title}</h2>
            {description && <p className="mt-1 text-base text-muted">{description}</p>}
          </div>
          <button
            aria-label={closeLabel}
            className={cn("grid size-9 shrink-0 place-items-center rounded-lg border border-line text-muted hover:bg-surface-hover", focusRing)}
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
