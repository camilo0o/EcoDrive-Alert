"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Select, Textarea, Input } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { createSighting, sightingFromForm } from "../lib/api";
import type { DashboardRoute, DashboardSpecies, LatLng } from "../types";
import { LocationFieldset } from "./location-fieldset";

type ReportFormProps = {
  routes: DashboardRoute[];
  species: DashboardSpecies[];
  onCancel: () => void;
  onCreated: () => void;
  onLocationFound: (coords: LatLng) => void;
};

export function ReportForm({ routes, species, onCancel, onCreated, onLocationFound }: ReportFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await createSighting(sightingFromForm(new FormData(event.currentTarget)));
      onCreated();
    } catch (submitError) {
      console.error("Error registrando el avistamiento:", submitError);
      setError(submitError instanceof Error ? submitError.message : "No se pudo registrar el avistamiento.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="grid gap-5" onSubmit={(event) => void handleSubmit(event)}>
      <Field label="¿Qué animal viste?" required>
        <Select defaultValue="" name="especieId" required>
          <option disabled value="">Selecciona una especie</option>
          {species.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
        </Select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Ruta">
          <Select defaultValue="" name="rutaId">
            <option value="">Sin especificar</option>
            {routes.map((route) => <option key={route.id} value={route.id}>{route.nombre}</option>)}
          </Select>
        </Field>
        <Field label="Kilómetro">
          <Input min="0" name="km" placeholder="Ej. 148" step="0.1" type="number" />
        </Field>
      </div>

      <LocationFieldset onLocationFound={onLocationFound} />

      <Field label={<>Descripción <span className="font-normal text-muted">(opcional)</span></>}>
        <Textarea maxLength={500} name="descripcion" placeholder="Cuéntanos qué observaste…" rows={3} />
      </Field>

      <Checkbox label="Publicar este reporte de forma anónima" name="esAnonimo" />

      {error && <FormMessage>{error}</FormMessage>}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button onClick={onCancel} variant="secondary">Cancelar</Button>
        <Button disabled={submitting} type="submit">
          {submitting ? "Enviando…" : "Confirmar avistamiento"}
        </Button>
      </div>
    </form>
  );
}
