"use client";

import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DashboardRoute, DashboardSighting, LatLng, NavigationMapState } from "../types";

// Leaflet usa window, así que el mapa solo se carga en el navegador.
const LeafletMap = dynamic(() => import("./leaflet-map"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[28rem] place-items-center text-base text-muted">Cargando mapa…</div>
  ),
});

type MapPanelProps = {
  sightings: DashboardSighting[];
  routes: DashboardRoute[];
  userLocation: LatLng | null;
  locating: boolean;
  locationError: string;
  onLocate: () => void;
  navigation: NavigationMapState;
  onMapPointSelect: (point: LatLng) => void;
};

export function MapPanel({ sightings, routes, userLocation, locating, locationError, onLocate, navigation, onMapPointSelect }: MapPanelProps) {
  return (
    <div className="relative min-h-[28rem] overflow-hidden rounded-xl bg-surface">
      <LeafletMap navigation={navigation} onMapPointSelect={onMapPointSelect} routes={routes} sightings={sightings} userLocation={navigation.currentLocation ?? userLocation} />
      <Button
        className="absolute right-3 top-3 z-[1000] shadow-md"
        disabled={locating}
        onClick={onLocate}
        size="sm"
        variant="secondary"
      >
        <MapPin aria-hidden="true" size={16} />
        {locating ? "Buscando…" : "Mi ubicación"}
      </Button>
      {locationError && (
        <p className="absolute inset-x-3 bottom-3 z-[1000] rounded-lg bg-white/95 px-3 py-2 text-sm text-danger shadow" role="alert">
          {locationError}
        </p>
      )}
      {userLocation && (
        <p className="absolute bottom-3 left-3 z-[1000] rounded-lg bg-white/95 px-3 py-2 text-xs text-muted shadow">
          Tu ubicación solo es visible para ti y se elimina en 2 minutos.
        </p>
      )}
      {navigation.route && (
        <p className="absolute bottom-3 left-3 z-[1000] rounded-lg bg-white/95 px-3 py-2 text-xs font-medium text-brand-strong shadow">
          Ruta A → B · {navigation.followUser ? "GPS en vivo" : "vista previa"}
        </p>
      )}
    </div>
  );
}
