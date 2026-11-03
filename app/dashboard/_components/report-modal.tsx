"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import type { DashboardRoute, DashboardSpecies } from "../types";
import { ReportForm } from "./report-form";

type ReportModalProps = {
  routes: DashboardRoute[];
  species: DashboardSpecies[];
  onClose: () => void;
  onCreated: () => void;
};

function ReportSuccess({ onClose }: { onClose: () => void }) {
  return (
    <div className="grid justify-items-center gap-3 py-4 text-center" role="status">
      <span aria-hidden="true" className="grid size-14 place-items-center rounded-full bg-brand-tint text-brand">
        <Check size={26} strokeWidth={2.5} />
      </span>
      <strong className="mt-1 text-xl font-semibold text-brand-strong">¡Gracias por reportar!</strong>
      <p className="max-w-sm text-base leading-relaxed text-muted">
        El avistamiento quedó registrado. ¡Gracias por ayudar!
      </p>
      <Button className="mt-2" onClick={onClose}>Volver al mapa</Button>
    </div>
  );
}

export function ReportModal({ routes, species, onClose, onCreated }: ReportModalProps) {
  const [submitted, setSubmitted] = useState(false);

  return (
    <Modal
      closeLabel="Cerrar formulario"
      description="Ayuda a otros conductores a prevenirse."
      onClose={onClose}
      size="lg"
      title="Reportar un avistamiento"
    >
      {submitted ? (
        <ReportSuccess onClose={onClose} />
      ) : (
        <ReportForm
          onCancel={onClose}
          onCreated={() => {
            setSubmitted(true);
            onCreated();
          }}
          routes={routes}
          species={species}
        />
      )}
    </Modal>
  );
}
