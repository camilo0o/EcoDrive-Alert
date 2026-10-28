"use client";

import Link from "next/link";
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

function markerPosition(sighting: DashboardSighting) {
  const [longitude, latitude] = sighting.ubicacion.coordinates;
  const left = Math.min(96, Math.max(4, ((longitude + 58.5) / 5.5) * 100));
  const top = Math.min(93, Math.max(7, 100 - ((latitude + 35) / 5) * 100));
  return { left: `${left}%`, top: `${top}%` };
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

    const formData = new FormData(event.currentTarget);
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
    <div className="dashboard-page">
      <header className="dashboard-header">
        <Link aria-label="Fauna en Ruta, inicio" className="brand" href="/">
          <span aria-hidden="true" className="brand-mark">F</span>
          <span>Fauna <span className="brand-light">en Ruta</span></span>
        </Link>
        <div className="dashboard-account">
          <span className="account-greeting">Hola, <strong>{userName}</strong></span>
          <LogoutButton />
        </div>
      </header>

      <main className="dashboard-main">
        <section className="dashboard-welcome">
          <div>
            <span className="eyebrow"><span className="status-dot" /> Comunidad en ruta</span>
            <h1>Conduce con más información.</h1>
            <p>Consulta avistamientos recientes o reporta fauna silvestre en tu camino.</p>
          </div>
          <button className="button button-dark" onClick={() => {
            setShowReportForm(true);
            setReportError("");
            setReportSuccess("");
          }}>
            <span aria-hidden="true">＋</span> Reportar avistamiento
          </button>
        </section>

        <section aria-label="Resumen de avistamientos" className="stat-grid">
          <article className="stat-card">
            <span className="stat-icon stat-icon-green" aria-hidden="true">⌖</span>
            <span className="stat-label">Reportes activos</span>
            <strong>{loading ? "—" : data.total}</strong>
            <small>En las rutas de Uruguay</small>
          </article>
          <article className="stat-card">
            <span className="stat-icon stat-icon-pink" aria-hidden="true">!</span>
            <span className="stat-label">Riesgo alto</span>
            <strong>{loading ? "—" : highRiskCount}</strong>
            <small>Avistamientos para tener en cuenta</small>
          </article>
          <article className="stat-card">
            <span className="stat-icon stat-icon-sand" aria-hidden="true">↗</span>
            <span className="stat-label">Rutas con actividad</span>
            <strong>{loading ? "—" : routeCount}</strong>
            <small>Con reportes visibles</small>
          </article>
        </section>

        <section className="workspace-card">
          <div className="workspace-heading">
            <div>
              <span className="eyebrow">Información comunitaria</span>
              <h2>Avistamientos cerca de las rutas</h2>
            </div>
            <div aria-label="Vista de avistamientos" className="view-switch" role="group">
              <button
                aria-pressed={activeView === "map"}
                className={activeView === "map" ? "view-button is-active" : "view-button"}
                onClick={() => setActiveView("map")}
                type="button"
              >
                <span aria-hidden="true">⌖</span> Mapa
              </button>
              <button
                aria-pressed={activeView === "reports"}
                className={activeView === "reports" ? "view-button is-active" : "view-button"}
                onClick={() => setActiveView("reports")}
                type="button"
              >
                <span aria-hidden="true">☷</span> Reportes
              </button>
            </div>
          </div>

          <div className="filter-row">
            <label>
              <span>Filtrar por ruta</span>
              <select aria-label="Filtrar por ruta" onChange={(event) => {
                const nextRouteId = event.target.value;
                setRouteId(nextRouteId);
                void loadDashboard(nextRouteId, speciesId);
              }} value={routeId}>
                <option value="">Todas las rutas</option>
                {data.rutas.map((route) => <option key={route.id} value={route.id}>{route.nombre}</option>)}
              </select>
            </label>
            <label>
              <span>Filtrar por especie</span>
              <select aria-label="Filtrar por especie" onChange={(event) => {
                const nextSpeciesId = event.target.value;
                setSpeciesId(nextSpeciesId);
                void loadDashboard(routeId, nextSpeciesId);
              }} value={speciesId}>
                <option value="">Todas las especies</option>
                {data.especies.map((species) => <option key={species.id} value={species.id}>{species.nombre}</option>)}
              </select>
            </label>
            <span className="result-count">{loading ? "Actualizando…" : `${data.total} ${data.total === 1 ? "reporte" : "reportes"}`}</span>
          </div>

          {error && <p className="inline-error" role="alert">{error}</p>}
          {loading && <p className="empty-state" role="status">Cargando rutas y avistamientos…</p>}
          {!loading && !error && data.avistamientos.length === 0 && (
            <div className="empty-state">
              <span aria-hidden="true">⌖</span>
              <strong>Aún no hay reportes para mostrar</strong>
              <p>Prueba con otros filtros o comparte el primer avistamiento.</p>
            </div>
          )}

          {!loading && data.avistamientos.length > 0 && (
            <div className={activeView === "map" ? "sightings-layout" : "sightings-layout reports-only"}>
              {activeView === "map" && (
                <div aria-label="Mapa esquemático de avistamientos en Uruguay" className="sighting-map">
                  <div className="map-map-label"><span className="status-dot" /> MAPA ESQUEMÁTICO</div>
                  <svg aria-hidden="true" className="dashboard-map-art" viewBox="0 0 640 430" preserveAspectRatio="none">
                    <path d="M66 339 C127 304 179 276 222 243 S296 201 345 170 S429 119 568 63" />
                    <path d="M143 46 C165 124 201 182 222 243 S284 330 300 402" />
                    <path d="M30 205 C138 195 240 214 345 170 S466 190 621 251" />
                    <path d="M368 31 C345 89 331 131 345 170 S385 255 446 408" />
                    <path className="river-line" d="M39 112 C145 135 212 99 278 124 S433 88 601 124" />
                    <text x="400" y="346">URUGUAY</text>
                  </svg>
                  <span className="dashboard-place dashboard-place-north">SALTO</span>
                  <span className="dashboard-place dashboard-place-middle">DURAZNO</span>
                  <span className="dashboard-place dashboard-place-south">MONTEVIDEO</span>
                  {data.avistamientos.map((sighting) => (
                    <button
                      aria-label={`Ver avistamiento de ${sighting.especie?.nombre ?? "especie desconocida"}`}
                      className={sighting.especie?.nivelRiesgo === "ALTO" ? "sighting-pin pin-high" : "sighting-pin"}
                      key={sighting.id}
                      onClick={() => void showDetails(sighting.id)}
                      style={markerPosition(sighting)}
                      type="button"
                    >!</button>
                  ))}
                  <div className="map-key"><span className="legend-dot legend-warning" /> Avistamientos activos</div>
                </div>
              )}
              <div aria-label="Lista de reportes" className="sighting-list">
                {data.avistamientos.map((sighting) => (
                  <article className="sighting-card" key={sighting.id}>
                    <div className="sighting-card-top">
                      <span className={sighting.especie?.nivelRiesgo === "ALTO" ? "risk-pill risk-high" : "risk-pill"}>
                        {riskLabel(sighting.especie?.nivelRiesgo)}
                      </span>
                      <span className="sighting-date">{formatDate(sighting.fechaHora)}</span>
                    </div>
                    <h3>{sighting.especie?.nombre ?? "Especie no disponible"}</h3>
                    <p className="sighting-location">
                      <span aria-hidden="true">⌖</span>
                      {sighting.rutaId
                        ? `${data.rutas.find((route) => route.id === sighting.rutaId)?.nombre ?? "Ruta"}${sighting.km !== null ? ` · km ${sighting.km}` : ""}`
                        : "Ubicación reportada"}
                    </p>
                    {sighting.descripcion && <p className="sighting-description">{sighting.descripcion}</p>}
                    <button className="text-link detail-link" onClick={() => void showDetails(sighting.id)} type="button">
                      Ver detalle <span aria-hidden="true">→</span>
                    </button>
                  </article>
                ))}
              </div>
            </div>
          )}
        </section>

        <footer className="dashboard-footer">
          <span>Los avistamientos son aportes de la comunidad.</span>
          <Link className="text-link" href="/">Volver al inicio <span aria-hidden="true">→</span></Link>
        </footer>
      </main>

      {showReportForm && (
        <div className="modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setShowReportForm(false);
        }}>
          <section aria-labelledby="report-title" aria-modal="true" className="report-dialog" role="dialog">
            <div className="dialog-heading">
              <div>
                <span className="eyebrow">Ayuda a otros conductores</span>
                <h2 id="report-title">Reportar un avistamiento</h2>
              </div>
              <button aria-label="Cerrar formulario" className="icon-button" onClick={() => setShowReportForm(false)} type="button">×</button>
            </div>
            {reportSuccess ? (
              <div className="report-success" role="status">
                <span aria-hidden="true">✓</span>
                <strong>¡Gracias por reportar!</strong>
                <p>{reportSuccess}</p>
                <button className="button button-dark" onClick={() => setShowReportForm(false)} type="button">Volver al mapa</button>
              </div>
            ) : (
              <form className="report-form" onSubmit={(event) => void submitReport(event)}>
                <label>
                  <span>¿Qué animal viste? <b>*</b></span>
                  <select name="especieId" required defaultValue="">
                    <option disabled value="">Selecciona una especie</option>
                    {data.especies.map((species) => <option key={species.id} value={species.id}>{species.nombre}</option>)}
                  </select>
                </label>
                <div className="form-two-columns">
                  <label>
                    <span>Ruta</span>
                    <select name="rutaId" defaultValue="">
                      <option value="">Sin especificar</option>
                      {data.rutas.map((route) => <option key={route.id} value={route.id}>{route.nombre}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>Kilómetro</span>
                    <input min="0" name="km" placeholder="Ej. 148" step="0.1" type="number" />
                  </label>
                </div>
                <fieldset className="coordinates-fieldset">
                  <legend>Ubicación aproximada <b>*</b></legend>
                  <div className="form-two-columns">
                    <label>
                      <span>Longitud</span>
                      <input max="180" min="-180" name="longitude" required step="any" type="number" defaultValue="-56.1645" />
                    </label>
                    <label>
                      <span>Latitud</span>
                      <input max="90" min="-90" name="latitude" required step="any" type="number" defaultValue="-34.9011" />
                    </label>
                  </div>
                  <small>Usa coordenadas en formato decimal. En Uruguay, la longitud suele ser negativa.</small>
                </fieldset>
                <label>
                  <span>Descripción <small>(opcional)</small></span>
                  <textarea maxLength={500} name="descripcion" placeholder="Cuéntanos qué observaste…" rows={3} />
                </label>
                <label className="checkbox-label">
                  <input name="esAnonimo" type="checkbox" />
                  <span>Publicar este reporte de forma anónima</span>
                </label>
                {reportError && <p className="inline-error" role="alert">{reportError}</p>}
                <div className="dialog-actions">
                  <button className="button button-light" onClick={() => setShowReportForm(false)} type="button">Cancelar</button>
                  <button className="button button-dark" disabled={submitting} type="submit">
                    {submitting ? "Enviando…" : "Confirmar avistamiento"}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}

      {(selectedSighting || detailLoading) && (
        <div className="modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setSelectedSighting(null);
        }}>
          <section aria-labelledby="detail-title" aria-modal="true" className="report-dialog detail-dialog" role="dialog">
            <div className="dialog-heading">
              <div>
                <span className="eyebrow">Información del reporte</span>
                <h2 id="detail-title">Detalle del avistamiento</h2>
              </div>
              <button aria-label="Cerrar detalle" className="icon-button" onClick={() => setSelectedSighting(null)} type="button">×</button>
            </div>
            {detailLoading && <p role="status">Cargando detalle…</p>}
            {selectedSighting && (
              <div className="detail-content">
                <span className="risk-pill">{riskLabel(selectedSighting.especie?.nivelRiesgo)}</span>
                <h3>{selectedSighting.especie?.nombre ?? "Especie no disponible"}</h3>
                <p>{selectedSighting.descripcion || "Sin descripción adicional."}</p>
                <dl>
                  <div><dt>Fecha y hora</dt><dd>{formatDate(selectedSighting.fechaHora)}</dd></div>
                  <div><dt>Reporte</dt><dd>{selectedSighting.metodo.toLowerCase()}</dd></div>
                  <div><dt>Coordenadas</dt><dd>{selectedSighting.ubicacion.coordinates.join(", ")}</dd></div>
                  <div><dt>Identidad</dt><dd>{selectedSighting.esAnonimo ? "Reporte anónimo" : selectedSighting.esPropio ? "Tu reporte" : "Usuario de la comunidad"}</dd></div>
                </dl>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
