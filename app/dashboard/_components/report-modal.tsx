"use client";

import { Check, FileText, Mic } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import type { DashboardRoute } from "../types";
import { ReportForm } from "./report-form";
import { VoiceReport } from "./voice-report";

type ReportModalProps = {
  routes: DashboardRoute[];
  rutaKmDisponible: boolean;
  errorRutaKm: string | null;
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

type ReportMode = "form" | "voice";

function ModeChooser({ onChoose }: { onChoose: (mode: ReportMode) => void }) {
  const options = [
    { mode: "voice" as const, icon: Mic, title: "Chat de voz", text: "Contale a la app qué animal viste, sin soltar el volante." },
    { mode: "form" as const, icon: FileText, title: "Formulario", text: "Buscá la especie y elegí la ubicación a mano." },
  ];
  return (
    <div className="grid gap-3">
      <p className="font-semibold text-brand-strong">¿Cómo querés reportarlo?</p>
      {options.map(({ mode, icon: Icon, title, text }) => (
        <button
          className="flex items-center gap-4 rounded-xl border border-line p-4 text-left hover:border-brand-accent hover:bg-brand-wash"
          key={mode}
          onClick={() => onChoose(mode)}
          type="button"
        >
          <Icon aria-hidden="true" className="shrink-0 text-brand" size={30} />
          <span className="grid">
            <span className="font-semibold text-brand-strong">{title}</span>
            <span className="text-sm text-muted">{text}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

export function ReportModal({
  routes,
  rutaKmDisponible,
  errorRutaKm,
  onClose,
  onCreated,
}: ReportModalProps) {
  const [submitted, setSubmitted] = useState(false);
  const [mode, setMode] = useState<ReportMode | null>(null);
  const handleCreated = () => {
    setSubmitted(true);
    onCreated();
  };

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
      ) : mode === null ? (
        <ModeChooser onChoose={setMode} />
      ) : mode === "voice" ? (
        <VoiceReport onCancel={onClose} onCreated={handleCreated} />
      ) : (
        <ReportForm
          onCancel={onClose}
          onCreated={handleCreated}
          errorRutaKm={errorRutaKm}
          routes={routes}
          rutaKmDisponible={rutaKmDisponible}
        />
      )}
    </Modal>
  );
}
