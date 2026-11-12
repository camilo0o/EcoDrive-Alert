"use client";

import { useAlertas } from "@/app/dashboard/hooks/use-alertas";

type Props = {
  trayectoId?: string;
  gpsError?: string;
  gpsReady?: boolean;
};

export function AlertasPanel({ trayectoId, gpsError = "", gpsReady = false }: Props) {
  const { alertas, error, loading, marcarComoVista } = useAlertas(trayectoId);

  if (!trayectoId) return null;

  return (
    <aside aria-live="polite" className="rounded-xl border border-amber-300 bg-amber-50 p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-amber-800">
        Alertas de fauna
      </h3>

      {error && <p className="mb-3 text-sm text-danger" role="alert">{error}</p>}
      {loading && alertas.length === 0 ? (
        <p className="text-sm text-amber-900">Buscando alertas cercanas…</p>
      ) : alertas.length === 0 ? (
        gpsError ? (
          <p className="text-sm text-amber-900">Las alertas requieren ubicación GPS. Corrige el permiso o la señal para continuar.</p>
        ) : gpsReady ? (
          <p className="text-sm text-amber-900">GPS activo. No hay avistamientos a menos de 500 m.</p>
        ) : (
          <p className="text-sm text-amber-900">Esperando la primera ubicación GPS para revisar avistamientos…</p>
        )
      ) : (
        <ul className="space-y-3">
          {alertas.map((alerta) => (
            <li key={alerta._id} className="rounded-lg border border-amber-200 bg-white p-3">
              <p className="text-sm font-medium text-slate-800">{alerta.mensaje}</p>
              <p className="mt-1 text-xs text-slate-500">
                Aprox. {Number(alerta.distanciaKm).toFixed(1)} km
              </p>

              <button
                type="button"
                onClick={() => void marcarComoVista(alerta._id)}
                className="mt-2 rounded bg-amber-600 px-2 py-1 text-xs font-medium text-white hover:bg-amber-700"
              >
                Marcar como vista
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
