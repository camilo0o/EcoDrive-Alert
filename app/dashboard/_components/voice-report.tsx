"use client";

import Image from "next/image";
import { LoaderCircle, Mic, RotateCcw, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { NivelRiesgo } from "@/lib/enums";
import { useDeviceLocation } from "../hooks/use-device-location";
import { useGrabadora } from "../hooks/use-grabadora";
import { riskLabel } from "../lib/risk";
import { crearAvistamientoPorVoz, interpretarTexto, necesitaRiesgo, transcribirAudio } from "../lib/voz";
import type { LatLng, VoiceSpecies } from "../types";

/** Corte automático para no mandar audios gigantes (el server acepta hasta 2 MB). */
const MAX_GRABACION_MS = 15_000;

const OPCIONES_RIESGO = [
  { nivel: NivelRiesgo.BAJO, etiqueta: "Bajo" },
  { nivel: NivelRiesgo.MEDIO, etiqueta: "Medio" },
  { nivel: NivelRiesgo.ALTO, etiqueta: "Alto" },
];

type Paso =
  | { tipo: "inicio" }
  | { tipo: "escuchando" }
  | { tipo: "procesando"; mensaje: string }
  | { tipo: "elegir"; transcripcion: string; opciones: VoiceSpecies[] }
  | { tipo: "confirmar"; transcripcion: string; especie: VoiceSpecies; nivelRiesgo: NivelRiesgo | null }
  | { tipo: "guardando" }
  | { tipo: "error"; mensaje: string; transcripcion?: string };

type VoiceReportProps = { onCancel: () => void; onCreated: () => void };

export function VoiceReport({ onCancel, onCreated }: VoiceReportProps) {
  const [paso, setPaso] = useState<Paso>({ tipo: "inicio" });
  const grabadora = useGrabadora();
  const { locate } = useDeviceLocation();
  const ubicacion = useRef<Promise<LatLng | null> | null>(null);
  const autoStop = useRef<number | null>(null);
  // Cada acción nueva "invalida" las tareas async anteriores: si el usuario toca Salir
  // mientras esperamos a Groq, la respuesta vieja llega pero se ignora.
  const turno = useRef(0);

  useEffect(() => () => {
    turno.current += 1;
    if (autoStop.current) window.clearTimeout(autoStop.current);
  }, []);

  function nuevoTurno() {
    turno.current += 1;
    return turno.current;
  }
  const vigente = (t: number) => turno.current === t;

  function errorDe(e: unknown, porDefecto: string) {
    return e instanceof Error ? e.message : porDefecto;
  }

  async function empezar() {
    const t = nuevoTurno();
    // La ubicación se pide al empezar: ahí estaba el animal, no donde estés al confirmar.
    ubicacion.current = locate();
    try {
      await grabadora.empezar();
    } catch {
      if (vigente(t)) {
        setPaso({ tipo: "error", mensaje: "No se pudo usar el micrófono. Revisá los permisos del navegador." });
      }
      return;
    }
    if (!vigente(t)) {
      grabadora.cancelar();
      return;
    }
    setPaso({ tipo: "escuchando" });
    autoStop.current = window.setTimeout(() => void terminar(), MAX_GRABACION_MS);
  }

  async function terminar() {
    if (autoStop.current) window.clearTimeout(autoStop.current);
    autoStop.current = null;
    const t = nuevoTurno();
    let texto = "";

    try {
      const audio = await grabadora.detener();
      setPaso({ tipo: "procesando", mensaje: "Transcribiendo…" });
      texto = await transcribirAudio(audio);
      if (!vigente(t)) return;

      setPaso({ tipo: "procesando", mensaje: "Buscando el animal…" });
      const resultado = texto
        ? await interpretarTexto(texto)
        : ({ estado: "no-entendida" } as const);
      if (!vigente(t)) return;

      if (resultado.estado === "encontrada") {
        setPaso({ tipo: "confirmar", transcripcion: texto, especie: resultado.especie, nivelRiesgo: null });
      } else if (resultado.estado === "ambigua") {
        setPaso({ tipo: "elegir", transcripcion: texto, opciones: resultado.opciones });
      } else {
        setPaso({
          tipo: "error",
          mensaje: "No entendí qué animal viste. Probá de nuevo.",
          transcripcion: texto || undefined,
        });
      }
    } catch (e) {
      if (vigente(t)) {
        setPaso({
          tipo: "error",
          mensaje: errorDe(e, "No se pudo procesar el audio."),
          transcripcion: texto || undefined,
        });
      }
    }
  }

  async function guardar(transcripcion: string, especie: VoiceSpecies, nivelRiesgo?: NivelRiesgo) {
    const t = nuevoTurno();
    setPaso({ tipo: "guardando" });

    const coords = await ubicacion.current;
    if (!vigente(t)) return;
    if (!coords) {
      setPaso({
        tipo: "error",
        mensaje: "No pude obtener tu ubicación. Activá el GPS y probá de nuevo.",
        transcripcion,
      });
      return;
    }

    try {
      await crearAvistamientoPorVoz(especie, coords, transcripcion, nivelRiesgo);
      if (vigente(t)) onCreated();
    } catch (e) {
      if (vigente(t)) {
        setPaso({ tipo: "error", mensaje: errorDe(e, "No se pudo registrar el avistamiento."), transcripcion });
      }
    }
  }

  function cerrar() {
    nuevoTurno();
    grabadora.cancelar();
    onCancel();
  }

  return (
    <div className="grid gap-5">
      <p className="text-base text-muted">Contale a la app qué animal viste, sin soltar el volante.</p>

      {"transcripcion" in paso && paso.transcripcion && (
        <p className="justify-self-end rounded-2xl rounded-br-sm bg-brand px-4 py-2 text-white">
          «{paso.transcripcion}»
        </p>
      )}

      {paso.tipo === "inicio" && (
        <div className="grid justify-items-center gap-3 py-4 text-center">
          <button
            aria-label="Empezar a grabar"
            className="grid size-24 place-items-center rounded-full bg-brand text-white shadow-lg ring-8 ring-brand-tint hover:bg-brand-strong"
            onClick={() => void empezar()}
            type="button"
          >
            <Mic size={40} />
          </button>
          <p className="text-sm text-muted">Tocá y decí, por ejemplo: «Vi un carpincho cruzando la ruta».</p>
        </div>
      )}

      {paso.tipo === "escuchando" && (
        <div className="grid justify-items-center gap-3 py-4 text-center" role="status">
          <button
            aria-label="Terminar de grabar"
            className="grid size-24 animate-pulse place-items-center rounded-full bg-danger text-white ring-8 ring-danger-tint"
            onClick={() => void terminar()}
            type="button"
          >
            <Square size={34} />
          </button>
          <p className="font-semibold text-brand-strong">Escuchando… tocá cuando termines</p>
        </div>
      )}

      {(paso.tipo === "procesando" || paso.tipo === "guardando") && (
        <p className="flex items-center justify-center gap-2 py-6 text-brand-strong" role="status">
          <LoaderCircle aria-hidden="true" className="animate-spin" size={22} />
          {paso.tipo === "guardando" ? "Guardando…" : paso.mensaje}
        </p>
      )}

      {paso.tipo === "elegir" && (
        <div className="grid gap-2">
          <p className="font-semibold text-brand-strong">¿Cuál de estos viste?</p>
          {paso.opciones.map((opcion) => (
            <button
              className="flex items-center gap-3 rounded-lg border border-line p-2 text-left hover:border-brand-accent"
              key={opcion.especieId ?? opcion.inaturalistTaxonId}
              onClick={() => setPaso({ tipo: "confirmar", transcripcion: paso.transcripcion, especie: opcion, nivelRiesgo: null })}
              type="button"
            >
              {opcion.fotoReferencia ? (
                <Image alt="" className="size-12 rounded-md object-cover" height={48} src={opcion.fotoReferencia} unoptimized width={48} />
              ) : (
                <span aria-hidden="true" className="size-12 rounded-md bg-brand-wash" />
              )}
              <span className="grid">
                <span className="font-semibold text-brand-strong">{opcion.nombre}</span>
                {opcion.nombreCientifico && <span className="text-sm italic text-muted">{opcion.nombreCientifico}</span>}
              </span>
            </button>
          ))}
          <Button onClick={() => void empezar()} variant="secondary">
            <RotateCcw size={18} /> Volver a grabar
          </Button>
        </div>
      )}

      {paso.tipo === "confirmar" && (() => {
        const pedirRiesgo = necesitaRiesgo(paso.especie);
        const elegir = (nivel: NivelRiesgo) => setPaso({ ...paso, nivelRiesgo: nivel });
        return (
          <div className="grid gap-4">
            <div className="grid gap-2 rounded-xl border border-line p-4">
              <strong className="text-lg text-brand-strong">{paso.especie.nombre}</strong>
              {paso.especie.nombreCientifico && <span className="-mt-2 text-sm italic text-muted">{paso.especie.nombreCientifico}</span>}
              {!pedirRiesgo && <span className="text-sm text-muted">{riskLabel(paso.especie.nivelRiesgo ?? undefined)}</span>}
              <span className="text-sm text-brand-strong">Ubicación: tu ubicación actual (GPS)</span>
            </div>

            {pedirRiesgo && (
              <fieldset className="grid gap-2">
                <legend className="mb-2 font-semibold text-brand-strong">
                  Es la primera vez que se clasifica. ¿Qué tan peligroso es para la ruta?
                </legend>
                <div className="grid grid-cols-3 gap-2">
                  {OPCIONES_RIESGO.map(({ nivel, etiqueta }) => (
                    <Button
                      aria-pressed={paso.nivelRiesgo === nivel}
                      key={nivel}
                      onClick={() => elegir(nivel)}
                      size="lg"
                      variant={paso.nivelRiesgo === nivel ? "primary" : "secondary"}
                    >
                      {etiqueta}
                    </Button>
                  ))}
                </div>
                <Button
                  aria-pressed={paso.nivelRiesgo === NivelRiesgo.SIN_CLASIFICAR}
                  className="justify-self-start"
                  onClick={() => elegir(NivelRiesgo.SIN_CLASIFICAR)}
                  size="sm"
                  variant={paso.nivelRiesgo === NivelRiesgo.SIN_CLASIFICAR ? "primary" : "ghost"}
                >
                  No sé
                </Button>
              </fieldset>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              <Button onClick={() => void empezar()} variant="secondary">
                <RotateCcw size={18} /> Volver a grabar
              </Button>
              <Button
                disabled={pedirRiesgo && !paso.nivelRiesgo}
                onClick={() => void guardar(paso.transcripcion, paso.especie, paso.nivelRiesgo ?? undefined)}
              >
                Confirmar avistamiento
              </Button>
            </div>
          </div>
        );
      })()}

      {paso.tipo === "error" && (
        <div className="grid gap-3">
          <FormMessage>{paso.mensaje}</FormMessage>
          <Button onClick={() => void empezar()}>
            <RotateCcw size={18} /> Volver a intentar
          </Button>
        </div>
      )}

      {paso.tipo !== "guardando" && (
        <Button className="justify-self-start" onClick={cerrar} variant="ghost">Salir</Button>
      )}
    </div>
  );
}
