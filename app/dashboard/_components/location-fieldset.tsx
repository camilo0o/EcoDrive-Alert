"use client";

import { MapPin } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useDeviceLocation } from "../hooks/use-device-location";

// Montevideo como punto de partida.
const DEFAULT_COORDS = { latitude: "-34.9011", longitude: "-56.1645" };

export function LocationFieldset() {
  const [coords, setCoords] = useState(DEFAULT_COORDS);
  const device = useDeviceLocation();

  async function fillWithCurrentLocation() {
    const found = await device.locate();
    if (!found) return;
    const [latitude, longitude] = found;
    setCoords({ latitude: String(latitude), longitude: String(longitude) });
  }

  return (
    <fieldset className="grid gap-4 rounded-xl border border-line p-4">
      <legend className="px-1 text-sm font-semibold text-brand-strong">
        Ubicación aproximada <span aria-hidden="true" className="text-danger-required">*</span>
      </legend>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Longitud">
          <Input
            max="180"
            min="-180"
            name="longitude"
            onChange={(event) => setCoords((prev) => ({ ...prev, longitude: event.target.value }))}
            required
            step="any"
            type="number"
            value={coords.longitude}
          />
        </Field>
        <Field label="Latitud">
          <Input
            max="90"
            min="-90"
            name="latitude"
            onChange={(event) => setCoords((prev) => ({ ...prev, latitude: event.target.value }))}
            required
            step="any"
            type="number"
            value={coords.latitude}
          />
        </Field>
      </div>
      <Button
        className="w-fit"
        disabled={device.loading}
        onClick={() => void fillWithCurrentLocation()}
        size="sm"
        type="button"
        variant="secondary"
      >
        <MapPin aria-hidden="true" size={16} />
        {device.loading ? "Buscando…" : "Usar mi ubicación actual"}
      </Button>
      {device.error && <p className="text-sm text-danger" role="alert">{device.error}</p>}
      <p className="text-sm leading-relaxed text-muted">
        Usa coordenadas en formato decimal. En Uruguay, la longitud suele ser negativa.
      </p>
    </fieldset>
  );
}
