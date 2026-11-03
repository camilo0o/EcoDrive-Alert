"use client";

import { Modal } from "@/components/ui/modal";
import { formatDate, reporterLabel } from "../lib/format";
import type { DashboardSighting } from "../types";
import { RiskBadge } from "./risk-badge";

type SightingDetailModalProps = {
  sighting: DashboardSighting | null;
  loading: boolean;
  onClose: () => void;
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-t border-line py-3 text-base last:border-b">
      <dt className="text-muted">{label}</dt>
      <dd className="max-w-[60%] text-right text-brand-strong">{value}</dd>
    </div>
  );
}

export function SightingDetailModal({ sighting, loading, onClose }: SightingDetailModalProps) {
  return (
    <Modal closeLabel="Cerrar detalle" onClose={onClose} title="Detalle del avistamiento">
      {loading && <p className="text-base text-muted" role="status">Cargando detalle…</p>}
      {sighting && (
        <div>
          <RiskBadge risk={sighting.especie?.nivelRiesgo} />
          <h3 className="mt-3 text-xl font-semibold text-brand-strong">
            {sighting.especie?.nombre ?? "Especie no disponible"}
          </h3>
          <p className="mt-2 text-base leading-relaxed text-muted">
            {sighting.descripcion || "Sin descripción adicional."}
          </p>
          <dl className="mt-6">
            <DetailRow label="Fecha y hora" value={formatDate(sighting.fechaHora)} />
            <DetailRow label="Reporte" value={sighting.metodo.toLowerCase()} />
            <DetailRow label="Coordenadas" value={sighting.ubicacion.coordinates.join(", ")} />
            <DetailRow label="Identidad" value={reporterLabel(sighting)} />
          </dl>
        </div>
      )}
    </Modal>
  );
}
