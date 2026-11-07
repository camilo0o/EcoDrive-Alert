"use client";

import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDeviceLocation } from "../hooks/use-device-location";

export function LocationFieldset() {
  const device = useDeviceLocation();
  const [latitude, longitude] = device.location ?? ["", ""];

  return (
    <fieldset className="grid gap-4 rounded-xl border border-line p-4">
      <legend className="px-1 text-sm font-semibold text-brand-strong">
        Ubicación del avistamiento <span aria-hidden="true" className="text-danger-required">*</span>
      </legend>
      <input name="longitude" type="hidden" value={longitude} />
      <input name="latitude" type="hidden" value={latitude} />
      <Button
        className="w-fit"
        disabled={device.loading}
        onClick={() => void device.locate()}
        size="sm"
        type="button"
        variant="secondary"
      >
        <MapPin aria-hidden="true" size={16} />
        {device.loading ? "Buscando…" : device.location ? "Actualizar mi ubicación" : "Usar mi ubicación actual"}
      </Button>
      {device.error && <p className="text-sm text-danger" role="alert">{device.error}</p>}
      <p className="text-sm leading-relaxed text-muted">
        {device.location
          ? "Ubicación lista: se usará para colocar el avistamiento en el mapa."
          : "Permite el acceso a tu ubicación para colocar el avistamiento en el mapa."}
      </p>
    </fieldset>
  );
}
