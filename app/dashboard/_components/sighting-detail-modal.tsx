"use client";

import Image from "next/image";
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
          {sighting.especie?.nombreCientifico && sighting.especie.nombreCientifico !== sighting.especie.nombre && (
            <p className="mt-1 text-sm italic text-muted">{sighting.especie.nombreCientifico}</p>
          )}
          <p className="mt-2 text-base leading-relaxed text-muted">
            {sighting.descripcion || "Sin descripción adicional."}
          </p>
          {sighting.especie?.fotoReferencia && sighting.especie.inaturalistTaxonId && (
            <figure className="mt-5">
              <Image
                alt={`Foto de referencia de ${sighting.especie.nombre}`}
                className="max-h-64 w-full rounded-lg object-cover"
                height={480}
                src={sighting.especie.fotoReferencia}
                unoptimized
                width={720}
              />
              <figcaption className="mt-2 text-xs leading-relaxed text-muted">
                Foto de referencia; no necesariamente corresponde a este avistamiento.{" "}
                {sighting.especie.atribucionFoto && <span>{sighting.especie.atribucionFoto} </span>}
                {sighting.especie.licenciaFoto && <span>({sighting.especie.licenciaFoto}) </span>}
                <a
                  className="underline"
                  href={`https://www.inaturalist.org/taxa/${sighting.especie.inaturalistTaxonId}`}
                  rel="noreferrer"
                  target="_blank"
                >
                  Fuente: iNaturalist
                </a>
              </figcaption>
            </figure>
          )}
          <dl className="mt-6">
            <DetailRow label="Fecha y hora" value={formatDate(sighting.fechaHora)} />
            <DetailRow label="Reporte" value={sighting.metodo.toLowerCase()} />
            <DetailRow label="Identidad" value={reporterLabel(sighting)} />
          </dl>
        </div>
      )}
    </Modal>
  );
}
