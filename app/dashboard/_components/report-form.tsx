"use client";

import Image from "next/image";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Select, Textarea, Input } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { NivelRiesgo } from "@/lib/enums";
import {
  createSighting,
  searchTaxa,
  sightingFromForm,
  SightingFormValidationError,
} from "../lib/api";
import type { DashboardRoute, TaxonSuggestion } from "../types";
import { LocationFieldset } from "./location-fieldset";

type ReportFormProps = {
  routes: DashboardRoute[];
  rutaKmDisponible: boolean;
  errorRutaKm: string | null;
  onCancel: () => void;
  onCreated: () => void;
};

export function ReportForm({
  routes,
  rutaKmDisponible,
  errorRutaKm,
  onCancel,
  onCreated,
}: ReportFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [selectedRouteId, setSelectedRouteId] = useState("");
  const [selectedKm, setSelectedKm] = useState("");
  const [locationMode, setLocationMode] = useState<"gps" | "route-km">("gps");
  const [query, setQuery] = useState("");
  const [taxa, setTaxa] = useState<TaxonSuggestion[]>([]);
  const [selectedTaxon, setSelectedTaxon] = useState<TaxonSuggestion | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2 || selectedTaxon) {
      setTaxa([]);
      setSearching(false);
      setSearchError("");
      return;
    }

    const controller = new AbortController();
    setSearching(true);
    const timeout = window.setTimeout(() => {
      setSearchError("");
      void searchTaxa(trimmed, controller.signal)
        .then(setTaxa)
        .catch((searchFailure: unknown) => {
          if (!controller.signal.aborted) {
            setTaxa([]);
            setSearchError(searchFailure instanceof Error ? searchFailure.message : "No se pudo buscar en iNaturalist.");
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearching(false);
        });
    }, 350);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [query, selectedTaxon]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await createSighting(sightingFromForm(new FormData(event.currentTarget)));
      onCreated();
    } catch (submitError) {
      if (!(submitError instanceof SightingFormValidationError)) {
        console.error("Error registrando el avistamiento:", submitError);
      }
      setError(submitError instanceof Error ? submitError.message : "No se pudo registrar el avistamiento.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="grid gap-5" onSubmit={(event) => void handleSubmit(event)}>
      <Field label="¿Qué animal viste? Busca en iNaturalist" required>
        <Input
          autoComplete="off"
          minLength={2}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelectedTaxon(null);
          }}
          placeholder="Ej. carpincho"
          required={!selectedTaxon}
          value={selectedTaxon
            ? selectedTaxon.nombreComun ?? selectedTaxon.nombreCientifico
            : query}
        />
      </Field>
      <input name="inaturalistTaxonId" type="hidden" value={selectedTaxon?.id ?? ""} />

      {searching && <p className="text-sm text-muted" role="status">Buscando en iNaturalist…</p>}
      {searchError && <FormMessage>{searchError}</FormMessage>}
      {taxa.length > 0 && !selectedTaxon && (
        <ul aria-label="Resultados de iNaturalist" className="-mt-3 grid gap-2">
          {taxa.map((taxon) => (
            <li key={taxon.id}>
              <button
                className="flex w-full items-center gap-3 rounded-lg border border-line p-2 text-left hover:border-brand-accent"
                onClick={() => {
                  setSelectedTaxon(taxon);
                  setQuery(taxon.nombreComun ?? taxon.nombreCientifico);
                  setTaxa([]);
                }}
                type="button"
              >
                {taxon.fotoReferencia ? (
                  <Image
                    alt=""
                    className="size-14 shrink-0 rounded-md object-cover"
                    height={56}
                    src={taxon.fotoReferencia}
                    unoptimized
                    width={56}
                  />
                ) : (
                  <span aria-hidden="true" className="size-14 shrink-0 rounded-md bg-brand-wash" />
                )}
                <span className="grid">
                  <span className="font-semibold text-brand-strong">{taxon.nombreComun ?? taxon.nombreCientifico}</span>
                  {taxon.nombreComun && <span className="text-sm italic text-muted">{taxon.nombreCientifico}</span>}
                </span>
              </button>
              {taxon.fotoReferencia && (
                <p className="px-2 pt-1 text-xs text-muted">
                  {taxon.atribucionFoto} {taxon.licenciaFoto && `(${taxon.licenciaFoto})`}{" "}
                  <a
                    className="underline"
                    href={`https://www.inaturalist.org/taxa/${taxon.id}`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Fuente
                  </a>
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      {query.trim().length >= 2 && !searching && !searchError && taxa.length === 0 && !selectedTaxon && (
        <p className="-mt-3 text-sm text-muted">No se encontraron especies. Prueba otro nombre.</p>
      )}
      {selectedTaxon && (
        <>
          <div className="-mt-3 flex items-center justify-between gap-3 rounded-lg bg-brand-wash p-3 text-sm">
            <span>
              Especie confirmada: <strong>{selectedTaxon.nombreComun ?? selectedTaxon.nombreCientifico}</strong>
              {selectedTaxon.nombreComun && <span className="ml-1 italic">({selectedTaxon.nombreCientifico})</span>}
            </span>
            <button
              className="shrink-0 font-semibold text-brand underline"
              onClick={() => {
                setSelectedTaxon(null);
                setQuery("");
              }}
              type="button"
            >
              Cambiar
            </button>
          </div>
          <Field label="Nivel de riesgo inicial" required>
            <Select defaultValue="" name="nivelRiesgo" required>
              <option disabled value="">Selecciona un nivel</option>
              <option value={NivelRiesgo.BAJO}>Bajo</option>
              <option value={NivelRiesgo.MEDIO}>Medio</option>
              <option value={NivelRiesgo.ALTO}>Alto</option>
            </Select>
          </Field>
          <p className="-mt-4 text-xs text-muted">
            Para especies ya clasificadas se conserva el nivel existente. En especies nuevas, esta selección será
            la clasificación inicial aportada por quien reporta.
          </p>
        </>
      )}
      <p className="-mt-4 text-xs text-muted">
        Identificación y fotos de referencia provistas por{" "}
        <a className="underline" href="https://www.inaturalist.org" rel="noreferrer" target="_blank">iNaturalist</a>.
      </p>

      <fieldset className="grid gap-3 rounded-xl border border-line p-4">
        <legend className="px-1 text-sm font-semibold text-brand-strong">Cómo indicar la ubicación</legend>
        <label className="flex items-start gap-3 text-sm text-brand-strong">
          <input
            checked={locationMode === "gps"}
            className="mt-1 accent-brand"
            name="locationMode"
            onChange={() => setLocationMode("gps")}
            type="radio"
            value="gps"
          />
          <span>
            <span className="block font-semibold">Usar mi ubicación actual (GPS)</span>
            <span className="text-muted">El pin se coloca donde estás ahora.</span>
          </span>
        </label>
        <label className={`flex items-start gap-3 text-sm ${rutaKmDisponible ? "text-brand-strong" : "text-muted"}`}>
          <input
            checked={locationMode === "route-km"}
            className="mt-1 accent-brand"
            disabled={!rutaKmDisponible}
            name="locationMode"
            onChange={() => setLocationMode("route-km")}
            type="radio"
            value="route-km"
          />
          <span>
            <span className="block font-semibold">Seleccionar ruta y km</span>
            <span>El pin se ubicará en el trazado oficial del MTOP.</span>
          </span>
        </label>
        {!rutaKmDisponible && errorRutaKm && (
          <p className="text-sm text-danger" role="alert">{errorRutaKm}</p>
        )}
      </fieldset>

      {locationMode === "gps" ? (
        <LocationFieldset />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ruta nacional" required>
            <Select
              onChange={(event) => {
                setSelectedRouteId(event.target.value);
                setSelectedKm("");
              }}
              required
              value={selectedRouteId}
            >
              <option disabled value="">Selecciona una ruta</option>
              {routes.filter((route) => route.codigoMtop).map((route) => (
                <option key={route.id} value={route.id}>{route.nombre}</option>
              ))}
            </Select>
          </Field>
          <Field label="Kilómetro calibrado" required>
            <Select
              disabled={!selectedRouteId}
              name="km"
              onChange={(event) => setSelectedKm(event.target.value)}
              required
              value={selectedKm}
            >
              <option disabled value="">Selecciona un km disponible</option>
              {routes.find((route) => route.id === selectedRouteId)?.kmsDisponibles?.map((kilometer) => (
                <option key={kilometer} value={String(kilometer)}>
                  km {new Intl.NumberFormat("es-UY", { maximumFractionDigits: 3 }).format(kilometer)}
                </option>
              ))}
            </Select>
          </Field>
          <input name="rutaId" type="hidden" value={selectedRouteId} />
        </div>
      )}

      <Field label={<>Descripción <span className="font-normal text-muted">(opcional)</span></>}>
        <Textarea maxLength={500} name="descripcion" placeholder="Cuéntanos qué observaste…" rows={3} />
      </Field>

      <Checkbox label="Publicar este reporte de forma anónima" name="esAnonimo" />

      {error && <FormMessage>{error}</FormMessage>}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button onClick={onCancel} type="button" variant="secondary">Cancelar</Button>
        <Button disabled={submitting} type="submit">
          {submitting ? "Enviando…" : "Confirmar avistamiento"}
        </Button>
      </div>
    </form>
  );
}
