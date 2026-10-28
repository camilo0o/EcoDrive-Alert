"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, Check, MapPin, Plus, Route, X } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import LogoutButton from "./logout-button";

export type DashboardRoute = { id: string; nombre: string; longitudKm: number };
export type DashboardSpecies = { id: string; nombre: string; nivelRiesgo: string; alias: string[] };
export type DashboardSighting = {
  id: string;
  especie: { id: string; nombre: string; nivelRiesgo: string } | null;
  rutaId: string | null;
  fechaHora: string;
  ubicacion: { type: "Point"; coordinates: [number, number] };
  km: number | null;
  foto: string | null;
  descripcion: string | null;
  metodo: string;
  confianza: number | null;
  esAnonimo: boolean;
  esPropio: boolean;
  estado: string;
};
export type DashboardInitialData = {
  rutas: DashboardRoute[];
  especies: DashboardSpecies[];
  avistamientos: DashboardSighting[];
  total: number;
};

const buttonPrimary =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-[13px] bg-[#20534a] px-5 text-sm font-bold text-white transition hover:-translate-y-px hover:bg-[#173d36] disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#287568]";
const buttonSecondary =
  "inline-flex min-h-12 items-center justify-center rounded-[13px] border border-[#dce5df] bg-white px-5 text-sm font-bold text-[#20534a] transition hover:-translate-y-px hover:bg-[#f0f6f1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#287568]";
const inputClasses =
  "min-h-[41px] w-full rounded-[9px] border border-[#e0e8e1] bg-[#fbfcfb] px-[11px] text-xs text-[#38564d] outline-none focus:border-[#287568] focus:ring-2 focus:ring-[#287568]/20";
const fieldLabel = "grid gap-[7px] text-[11px] font-bold text-[#173d36]";

async function responseData<T>(response: Response): Promise<T> {
  const body = await response.json() as { error?: string };
  if (!response.ok) {
    throw new Error(body.error ?? "No se pudo completar la solicitud.");
  }
  return body as T;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-UY", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function riskLabel(risk: string | undefined) {
  if (risk === "ALTO") return "Riesgo alto";
  if (risk === "MEDIO") return "Riesgo medio";
  if (risk === "BAJO") return "Riesgo bajo";
  return "Sin nivel";
}

export default function DashboardClient({
  userName,
  initialData,
}: {
  userName: string;
  initialData: DashboardInitialData;
}) {
  const [data, setData] = useState(initialData);
  const [routeId, setRouteId] = useState("");
  const [speciesId, setSpeciesId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeView, setActiveView] = useState<"map" | "reports">("map");
  const [selectedSighting, setSelectedSighting] = useState<DashboardSighting | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportError, setReportError] = useState("");
  const [reportSuccess, setReportSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadDashboard(nextRouteId = routeId, nextSpeciesId = speciesId) {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ limit: "100" });
    if (nextRouteId) params.set("rutaId", nextRouteId);
    if (nextSpeciesId) params.set("especieId", nextSpeciesId);

    try {
      const [routesResponse, speciesResponse, sightingsResponse] = await Promise.all([
        fetch("/api/rutas"),
        fetch("/api/especies"),
        fetch(`/api/avistamientos?${params.toString()}`),
      ]);
      const [routes, species, sightings] = await Promise.all([
        responseData<{ rutas: DashboardRoute[] }>(routesResponse),
        responseData<{ especies: DashboardSpecies[] }>(speciesResponse),
        responseData<{ avistamientos: DashboardSighting[]; total: number }>(sightingsResponse),
      ]);
      setData({
        rutas: routes.rutas,
        especies: species.especies,
        avistamientos: sightings.avistamientos,
        total: sightings.total,
      });
    } catch (loadError) {
      console.error("Error cargando el panel:", loadError);
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar la información.");
    } finally {
      setLoading(false);
    }
  }

  const highRiskCount = useMemo(
    () => data.avistamientos.filter((sighting) => sighting.especie?.nivelRiesgo === "ALTO").length,
    [data.avistamientos],
  );
  const routeCount = useMemo(
    () => new Set(data.avistamientos.map((sighting) => sighting.rutaId).filter(Boolean)).size,
    [data.avistamientos],
  );

  async function showDetails(id: string) {
    setDetailLoading(true);
    setSelectedSighting(null);
    try {
      const response = await fetch(`/api/avistamientos/${id}`);
      const result = await responseData<{ avistamiento: DashboardSighting }>(response);
      setSelectedSighting(result.avistamiento);
    } catch (detailError) {
      console.error("Error cargando el detalle:", detailError);
      setError(detailError instanceof Error ? detailError.message : "No se pudo cargar el detalle.");
    } finally {
      setDetailLoading(false);
    }
  }

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setReportError("");
    setReportSuccess("");
    setSubmitting(true);

    const formData = new FormData(form);
    const body = {
      especieId: String(formData.get("especieId") ?? ""),
      rutaId: String(formData.get("rutaId") ?? "") || undefined,
      km: formData.get("km") ? Number(formData.get("km")) : undefined,
      coordinates: [
        Number(formData.get("longitude")),
        Number(formData.get("latitude")),
      ],
      descripcion: String(formData.get("descripcion") ?? "").trim() || undefined,
      esAnonimo: formData.get("esAnonimo") === "on",
    };

    try {
      const response = await fetch("/api/avistamientos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      await responseData<{ avistamiento: DashboardSighting }>(response);
      setReportSuccess("El avistamiento quedó registrado. ¡Gracias por ayudar!");
      form.reset();
      await loadDashboard();
    } catch (submitError) {
      console.error("Error registrando el avistamiento:", submitError);
      setReportError(submitError instanceof Error ? submitError.message : "No se pudo registrar el avistamiento.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-[min(1240px,calc(100%-64px))] pb-[30px] max-sm:w-[min(100%-36px,560px)]">
      <header className="flex min-h-[78px] items-center justify-between border-b border-[#20534a]/10">
        <Link aria-label="Fauna en Ruta, inicio" className="inline-flex items-center gap-[11px] text-[19px] font-extrabold tracking-[-.04em] text-[#173d36] max-sm:gap-2 max-sm:text-[17px]" href="/">
          <span aria-hidden="true" className="grid size-[35px] place-items-center rounded-[12px_12px_12px_4px] bg-[#20534a] text-xl text-white max-sm:size-[31px]">F</span>
          <span>Fauna <span className="font-medium">en Ruta</span></span>
        </Link>
        <div className="flex items-center gap-[17px] max-sm:gap-[10px]">
          <span className="text-xs text-[#6d807b] max-sm:hidden">Hola, <strong className="text-[#173d36]">{userName}</strong></span>
          <LogoutButton />
        </div>
      </header>

      <main className="pt-[38px] max-sm:pt-7">
        <section className="mb-[25px] flex items-end justify-between gap-5 max-sm:items-start max-sm:flex-col">
          <div>
            <span className="inline-flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.11em] text-[#287568]">
              <span aria-hidden="true" className="size-2 rounded-full bg-[#64a885] shadow-[0_0_0_4px_rgba(100,168,133,.14)]" />
              Comunidad en ruta
            </span>
            <h1 className="mb-2 mt-[10px] text-[clamp(27px,4vw,39px)] font-bold tracking-[-.06em] text-[#173d36]">Conduce con más información.</h1>
            <p className="m-0 text-[13px] text-[#6d807b]">Consulta avistamientos recientes o reporta fauna silvestre en tu camino.</p>
          </div>
          <button className={`${buttonPrimary} max-sm:min-h-[43px]`} onClick={() => {
            setShowReportForm(true);
            setReportError("");
            setReportSuccess("");
          }}>
            <Plus aria-hidden="true" size={17} /> Reportar avistamiento
          </button>
        </section>

        <section aria-label="Resumen de avistamientos" className="mb-[22px] grid grid-cols-3 gap-4 max-sm:gap-2">
          <article className="grid min-h-[140px] grid-cols-[1fr_auto] content-start rounded-[17px] border border-[#e4eae5] bg-white p-[19px] max-sm:min-h-[118px] max-sm:p-2">
            <span aria-hidden="true" className="row-span-2 grid size-[33px] place-items-center rounded-[11px] bg-[#e4f0e9] text-[#20534a] max-sm:size-7"><MapPin size={17} /></span>
            <span className="self-center justify-self-end text-[11px] text-[#6d807b] max-sm:text-right max-sm:text-[8px]">Reportes activos</span>
            <strong className="col-start-2 mt-[9px] justify-self-end text-[25px] font-bold tracking-[-.05em] text-[#173d36] max-sm:mt-[7px] max-sm:text-[21px]">{loading ? "—" : data.total}</strong>
            <small className="col-span-2 mt-4 self-end text-[10px] text-[#899a91] max-sm:mt-3 max-sm:text-[9px]">En las rutas de Uruguay</small>
          </article>
          <article className="grid min-h-[140px] grid-cols-[1fr_auto] content-start rounded-[17px] border border-[#e4eae5] bg-white p-[19px] max-sm:min-h-[118px] max-sm:p-2">
            <span aria-hidden="true" className="row-span-2 grid size-[33px] place-items-center rounded-[11px] bg-[#fae9e9] text-[#ad5361] max-sm:size-7"><AlertTriangle size={17} /></span>
            <span className="self-center justify-self-end text-[11px] text-[#6d807b] max-sm:text-right max-sm:text-[8px]">Riesgo alto</span>
            <strong className="col-start-2 mt-[9px] justify-self-end text-[25px] font-bold tracking-[-.05em] text-[#173d36] max-sm:mt-[7px] max-sm:text-[21px]">{loading ? "—" : highRiskCount}</strong>
            <small className="col-span-2 mt-4 self-end text-[10px] text-[#899a91] max-sm:mt-3 max-sm:text-[9px]">Avistamientos para tener en cuenta</small>
          </article>
          <article className="grid min-h-[140px] grid-cols-[1fr_auto] content-start rounded-[17px] border border-[#e4eae5] bg-white p-[19px] max-sm:min-h-[118px] max-sm:p-2">
            <span aria-hidden="true" className="row-span-2 grid size-[33px] place-items-center rounded-[11px] bg-[#f6f0df] text-[#947a43] max-sm:size-7"><Route size={17} /></span>
            <span className="self-center justify-self-end text-[11px] text-[#6d807b] max-sm:text-right max-sm:text-[8px]">Rutas con actividad</span>
            <strong className="col-start-2 mt-[9px] justify-self-end text-[25px] font-bold tracking-[-.05em] text-[#173d36] max-sm:mt-[7px] max-sm:text-[21px]">{loading ? "—" : routeCount}</strong>
            <small className="col-span-2 mt-4 self-end text-[10px] text-[#899a91] max-sm:mt-3 max-sm:text-[9px]">Con reportes visibles</small>
          </article>
        </section>

        <section className="rounded-[20px] border border-[#e4eae5] bg-white p-[23px] shadow-[0_10px_35px_rgba(29,66,54,.035)] max-sm:p-[15px]">
          <div className="mb-[18px] flex items-center justify-between gap-5 max-sm:items-start max-sm:flex-col max-sm:gap-3">
            <div>
              <span className="inline-flex items-center text-[11px] font-extrabold uppercase tracking-[.11em] text-[#287568]">Información comunitaria</span>
              <h2 className="mb-0 mt-1 text-[19px] font-bold tracking-[-.04em] max-sm:text-[17px]">Avistamientos cerca de las rutas</h2>
            </div>
            <div aria-label="Vista de avistamientos" className="inline-flex gap-1 rounded-[11px] bg-[#f3f6f3] p-1" role="group">
              <button
                aria-pressed={activeView === "map"}
                className={`min-h-[33px] rounded-lg px-[11px] text-[11px] font-bold ${activeView === "map" ? "bg-white text-[#20534a] shadow-[0_2px_6px_rgba(28,63,53,.09)]" : "text-[#6d807b]"}`}
                onClick={() => setActiveView("map")}
                type="button"
              >
                Mapa
              </button>
              <button
                aria-pressed={activeView === "reports"}
                className={`min-h-[33px] rounded-lg px-[11px] text-[11px] font-bold ${activeView === "reports" ? "bg-white text-[#20534a] shadow-[0_2px_6px_rgba(28,63,53,.09)]" : "text-[#6d807b]"}`}
                onClick={() => setActiveView("reports")}
                type="button"
              >
                Reportes
              </button>
            </div>
          </div>

          <div className="mb-[17px] flex items-end gap-3 max-sm:items-stretch max-sm:flex-col">
            <label className={`${fieldLabel} max-sm:grid-cols-[105px_1fr] max-sm:items-center`}>
              <span>Filtrar por ruta</span>
              <select aria-label="Filtrar por ruta" className={`${inputClasses} min-w-[185px]`} onChange={(event) => {
                const nextRouteId = event.target.value;
                setRouteId(nextRouteId);
                void loadDashboard(nextRouteId, speciesId);
              }} value={routeId}>
                <option value="">Todas las rutas</option>
                {data.rutas.map((route) => <option key={route.id} value={route.id}>{route.nombre}</option>)}
              </select>
            </label>
            <label className={`${fieldLabel} max-sm:grid-cols-[105px_1fr] max-sm:items-center`}>
              <span>Filtrar por especie</span>
              <select aria-label="Filtrar por especie" className={`${inputClasses} min-w-[185px]`} onChange={(event) => {
                const nextSpeciesId = event.target.value;
                setSpeciesId(nextSpeciesId);
                void loadDashboard(routeId, nextSpeciesId);
              }} value={speciesId}>
                <option value="">Todas las especies</option>
                {data.especies.map((species) => <option key={species.id} value={species.id}>{species.nombre}</option>)}
              </select>
            </label>
            <span className="mb-[10px] ml-auto text-[10px] text-[#899a91] max-sm:m-0 max-sm:text-right">{loading ? "Actualizando…" : `${data.total} ${data.total === 1 ? "reporte" : "reportes"}`}</span>
          </div>

          {error && <p className="my-3 text-xs text-[#a33945]" role="alert">{error}</p>}
          <div className={`grid min-h-[380px] gap-[14px] ${activeView === "map" ? "grid-cols-[minmax(0,1.2fr)_minmax(270px,.8fr)] max-sm:grid-cols-1" : "grid-cols-1"}`}>
            {activeView === "map" && (
              <div aria-hidden="true" className="min-h-[380px] rounded-[14px] bg-[#f7faf7]" />
            )}
            <div aria-label="Lista de reportes" className={`grid max-h-[380px] content-start gap-[9px] overflow-y-auto pr-[3px] ${activeView === "reports" ? "max-h-[430px] grid-cols-2 overflow-y-visible max-sm:grid-cols-1" : ""}`}>
              {loading ? (
                <p className="grid min-h-[185px] place-items-center rounded-[14px] bg-[#f7faf7] text-center text-sm text-[#6d807b]" role="status">Cargando rutas y avistamientos…</p>
              ) : data.avistamientos.length === 0 ? (
                <div className="grid min-h-[185px] content-center justify-items-center gap-[9px] rounded-[14px] bg-[#f7faf7] text-center">
                  <strong className="text-sm text-[#20534a]">Aún no hay reportes para mostrar</strong>
                  <p className="m-0 text-[11px] text-[#6d807b]">Prueba con otros filtros o comparte el primer avistamiento.</p>
                </div>
              ) : data.avistamientos.map((sighting) => (
                  <article className="rounded-xl border border-[#e8eee8] bg-white p-[13px]" key={sighting.id}>
                    <div className="flex items-center justify-between gap-2">
                      <span className={`inline-flex items-center rounded-[20px] px-2 py-[5px] text-[9px] font-bold ${sighting.especie?.nivelRiesgo === "ALTO" ? "bg-[#fae9e9] text-[#ad5361]" : "bg-[#edf4ee] text-[#20534a]"}`}>
                        {riskLabel(sighting.especie?.nivelRiesgo)}
                      </span>
                      <span className="text-[9px] text-[#8b9b92]">{formatDate(sighting.fechaHora)}</span>
                    </div>
                    <h3 className="mb-[5px] mt-[10px] text-sm font-bold tracking-[-.025em]">{sighting.especie?.nombre ?? "Especie no disponible"}</h3>
                    <p className="m-0 text-[10px] leading-relaxed text-[#6d807b]">
                      <MapPin aria-hidden="true" className="mr-[5px] inline text-[#287568]" size={12} />
                      {sighting.rutaId
                        ? `${data.rutas.find((route) => route.id === sighting.rutaId)?.nombre ?? "Ruta"}${sighting.km !== null ? ` · km ${sighting.km}` : ""}`
                        : "Ubicación reportada"}
                    </p>
                    {sighting.descripcion && <p className="mb-0 mt-[7px] text-[10px] leading-relaxed text-[#6d807b]">{sighting.descripcion}</p>}
                    <button className="mt-[10px] inline-flex gap-[7px] border-0 bg-transparent p-0 text-[10px] font-bold text-[#20534a] hover:text-[#287568] hover:underline" onClick={() => void showDetails(sighting.id)} type="button">
                      Ver detalle <ArrowRight aria-hidden="true" size={13} />
                    </button>
                  </article>
              ))}
            </div>
          </div>
        </section>

        <footer className="mt-5 flex min-h-[55px] items-center justify-between gap-[14px] border-t border-[#20534a]/10 text-[11px] text-[#6d807b] max-sm:min-h-[51px] max-sm:text-[9px]">
          <span>Los avistamientos son aportes de la comunidad.</span>
          <Link className="inline-flex items-center gap-1 font-bold text-[#20534a] hover:underline" href="/">Volver al inicio <ArrowRight aria-hidden="true" size={13} /></Link>
        </footer>
      </main>

      {showReportForm && (
        <div className="fixed inset-0 z-20 grid overflow-y-auto place-items-center bg-[#132c27]/50 p-[22px] backdrop-blur-sm" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setShowReportForm(false);
        }}>
          <section aria-labelledby="report-title" aria-modal="true" className="max-h-[min(90vh,780px)] w-full max-w-[540px] overflow-y-auto rounded-[19px] border border-white/60 bg-white p-[23px] shadow-[0_25px_80px_rgba(12,39,34,.25)] max-sm:p-[18px]" role="dialog">
            <div className="mb-[19px] flex items-start justify-between gap-3">
              <div>
                <span className="inline-flex items-center text-[11px] font-extrabold uppercase tracking-[.11em] text-[#287568]">Ayuda a otros conductores</span>
                <h2 id="report-title" className="mb-0 mt-[6px] text-xl font-bold tracking-[-.045em]">Reportar un avistamiento</h2>
              </div>
              <button aria-label="Cerrar formulario" className="grid size-[31px] place-items-center rounded-[9px] border border-[#e4eae5] bg-white text-[#6d807b] hover:bg-[#f0f6f1]" onClick={() => setShowReportForm(false)} type="button"><X aria-hidden="true" size={17} /></button>
            </div>
            {reportSuccess ? (
              <div className="grid justify-items-center px-[10px] pb-2 pt-[22px] text-center" role="status">
                <span aria-hidden="true" className="grid size-12 place-items-center rounded-full bg-[#e4f0e9] text-[#20534a]"><Check size={23} strokeWidth={2.5} /></span>
                <strong className="mt-[14px] text-lg">¡Gracias por reportar!</strong>
                <p className="max-w-[310px] text-xs leading-relaxed text-[#6d807b]">{reportSuccess}</p>
                <button className={buttonPrimary} onClick={() => setShowReportForm(false)} type="button">Volver al mapa</button>
              </div>
            ) : (
              <form className="grid gap-[14px]" onSubmit={(event) => void submitReport(event)}>
                <label className={fieldLabel}>
                  <span>¿Qué animal viste? <b className="text-[#be5860]">*</b></span>
                  <select className={inputClasses} name="especieId" required defaultValue="">
                    <option disabled value="">Selecciona una especie</option>
                    {data.especies.map((species) => <option key={species.id} value={species.id}>{species.nombre}</option>)}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-3 max-[390px]:grid-cols-1">
                  <label className={fieldLabel}>
                    <span>Ruta</span>
                    <select className={inputClasses} name="rutaId" defaultValue="">
                      <option value="">Sin especificar</option>
                      {data.rutas.map((route) => <option key={route.id} value={route.id}>{route.nombre}</option>)}
                    </select>
                  </label>
                  <label className={fieldLabel}>
                    <span>Kilómetro</span>
                    <input className={inputClasses} min="0" name="km" placeholder="Ej. 148" step="0.1" type="number" />
                  </label>
                </div>
                <fieldset className="grid gap-[9px] rounded-[11px] border border-[#e5ece6] p-3">
                  <legend className="px-[5px] text-[11px] font-bold text-[#173d36]">Ubicación aproximada <b className="text-[#be5860]">*</b></legend>
                  <div className="grid grid-cols-2 gap-3 max-[390px]:grid-cols-1">
                    <label className={fieldLabel}>
                      <span>Longitud</span>
                      <input className={inputClasses} max="180" min="-180" name="longitude" required step="any" type="number" defaultValue="-56.1645" />
                    </label>
                    <label className={fieldLabel}>
                      <span>Latitud</span>
                      <input className={inputClasses} max="90" min="-90" name="latitude" required step="any" type="number" defaultValue="-34.9011" />
                    </label>
                  </div>
                  <small className="text-[9px] leading-relaxed text-[#6d807b]">Usa coordenadas en formato decimal. En Uruguay, la longitud suele ser negativa.</small>
                </fieldset>
                <label className={fieldLabel}>
                  <span>Descripción <small className="font-normal text-[#6d807b]">(opcional)</small></span>
                  <textarea className={`${inputClasses} min-h-20 resize-y py-[10px]`} maxLength={500} name="descripcion" placeholder="Cuéntanos qué observaste…" rows={3} />
                </label>
                <label className="flex items-center gap-[9px] text-[11px] text-[#173d36]">
                  <input className="size-[15px] accent-[#20534a]" name="esAnonimo" type="checkbox" />
                  <span>Publicar este reporte de forma anónima</span>
                </label>
                {reportError && <p className="my-3 text-xs text-[#a33945]" role="alert">{reportError}</p>}
                <div className="mt-1 flex justify-end gap-[9px]">
                  <button className={`${buttonSecondary} min-h-[42px] px-[14px] text-[11px]`} onClick={() => setShowReportForm(false)} type="button">Cancelar</button>
                  <button className={`${buttonPrimary} min-h-[42px] px-[14px] text-[11px]`} disabled={submitting} type="submit">
                    {submitting ? "Enviando…" : "Confirmar avistamiento"}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}

      {(selectedSighting || detailLoading) && (
        <div className="fixed inset-0 z-20 grid overflow-y-auto place-items-center bg-[#132c27]/50 p-[22px] backdrop-blur-sm" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setSelectedSighting(null);
        }}>
          <section aria-labelledby="detail-title" aria-modal="true" className="max-h-[min(90vh,780px)] w-full max-w-[470px] overflow-y-auto rounded-[19px] border border-white/60 bg-white p-[23px] shadow-[0_25px_80px_rgba(12,39,34,.25)] max-sm:p-[18px]" role="dialog">
            <div className="mb-[19px] flex items-start justify-between gap-3">
              <div>
                <span className="inline-flex items-center text-[11px] font-extrabold uppercase tracking-[.11em] text-[#287568]">Información del reporte</span>
                <h2 id="detail-title" className="mb-0 mt-[6px] text-xl font-bold tracking-[-.045em]">Detalle del avistamiento</h2>
              </div>
              <button aria-label="Cerrar detalle" className="grid size-[31px] place-items-center rounded-[9px] border border-[#e4eae5] bg-white text-[#6d807b] hover:bg-[#f0f6f1]" onClick={() => setSelectedSighting(null)} type="button"><X aria-hidden="true" size={17} /></button>
            </div>
            {detailLoading && <p className="text-xs text-[#6d807b]" role="status">Cargando detalle…</p>}
            {selectedSighting && (
              <div>
                <span className="inline-flex items-center rounded-[20px] bg-[#edf4ee] px-2 py-[5px] text-[9px] font-bold text-[#20534a]">{riskLabel(selectedSighting.especie?.nivelRiesgo)}</span>
                <h3 className="mb-2 mt-3 text-lg font-bold">{selectedSighting.especie?.nombre ?? "Especie no disponible"}</h3>
                <p className="text-xs leading-relaxed text-[#6d807b]">{selectedSighting.descripcion || "Sin descripción adicional."}</p>
                <dl className="mt-[18px] grid">
                  <div className="flex justify-between gap-[15px] border-t border-[#e4eae5] py-3 text-[11px]"><dt className="text-[#6d807b]">Fecha y hora</dt><dd className="m-0 max-w-[60%] text-right text-[#173d36]">{formatDate(selectedSighting.fechaHora)}</dd></div>
                  <div className="flex justify-between gap-[15px] border-t border-[#e4eae5] py-3 text-[11px]"><dt className="text-[#6d807b]">Reporte</dt><dd className="m-0 max-w-[60%] text-right text-[#173d36]">{selectedSighting.metodo.toLowerCase()}</dd></div>
                  <div className="flex justify-between gap-[15px] border-t border-[#e4eae5] py-3 text-[11px]"><dt className="text-[#6d807b]">Coordenadas</dt><dd className="m-0 max-w-[60%] text-right text-[#173d36]">{selectedSighting.ubicacion.coordinates.join(", ")}</dd></div>
                  <div className="flex justify-between gap-[15px] border-y border-[#e4eae5] py-3 text-[11px]"><dt className="text-[#6d807b]">Identidad</dt><dd className="m-0 max-w-[60%] text-right text-[#173d36]">{selectedSighting.esAnonimo ? "Reporte anónimo" : selectedSighting.esPropio ? "Tu reporte" : "Usuario de la comunidad"}</dd></div>
                </dl>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
