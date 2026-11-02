"use client";

import { useEffect, useRef, useState } from "react";
import type { CircleMarker, LayerGroup, Map as LeafletMap } from "leaflet";
import type { DashboardRoute, DashboardSighting } from "./dashboard-client";

const URUGUAY_CENTER: [number, number] = [-34.9, -56.16];

export default function LeafletMapView({
  sightings,
  routes,
  userLocation,
}: {
  sightings: DashboardSighting[];
  routes: DashboardRoute[];
  userLocation: [number, number] | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<LayerGroup | null>(null);
  const userMarkerRef = useRef<CircleMarker | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    let disposed = false;

    void import("leaflet").then((L) => {
      if (disposed || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        center: URUGUAY_CENTER,
        zoom: 6,
        scrollWheelZoom: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      mapRef.current = map;
      markersRef.current = L.layerGroup().addTo(map);
      setMapReady(true);

      window.requestAnimationFrame(() => map.invalidateSize());
    });

    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current = null;
      userMarkerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !markersRef.current) return;

    void import("leaflet").then((L) => {
      const map = mapRef.current;
      const markerLayer = markersRef.current;
      if (!map || !markerLayer) return;

      markerLayer.clearLayers();
      const positions: [number, number][] = [];

      for (const sighting of sightings) {
        const [longitude, latitude] = sighting.ubicacion.coordinates;
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;

        const position: [number, number] = [latitude, longitude];
        positions.push(position);
        const risk = sighting.especie?.nivelRiesgo;
        const highRisk = risk === "ALTO";
        const mediumRisk = risk === "MEDIO";
        const marker = L.circleMarker(position, {
          radius: 8,
          color: highRisk ? "#a33945" : mediumRisk ? "#947a43" : "#20534a",
          weight: 2,
          fillColor: highRisk ? "#d97178" : mediumRisk ? "#e2bb67" : "#64a885",
          fillOpacity: 0.9,
        });

        const popup = document.createElement("div");
        const title = document.createElement("strong");
        title.textContent = sighting.especie?.nombre ?? "Especie no disponible";
        popup.append(title);

        const details = document.createElement("p");
        details.className = "leaflet-sighting-popup-details";
        const routeName = sighting.rutaId
          ? ` · ${routes.find((route) => route.id === sighting.rutaId)?.nombre ?? "Ruta"}${sighting.km !== null ? `, km ${sighting.km}` : ""}`
          : "";
        const riskLabel = risk === "ALTO" ? "Riesgo alto" : risk === "MEDIO" ? "Riesgo medio" : risk === "BAJO" ? "Riesgo bajo" : "Sin nivel";
        details.textContent = `${riskLabel}${routeName}`;
        popup.append(details);

        marker.bindPopup(popup).addTo(markerLayer);
      }

      if (userLocation) {
        positions.push(userLocation);
        userMarkerRef.current?.remove();
        userMarkerRef.current = L.circleMarker(userLocation, {
          radius: 9,
          color: "#1769aa",
          weight: 3,
          fillColor: "#4aa3df",
          fillOpacity: 0.9,
        }).bindPopup("Tu ubicación").addTo(map);
      } else {
        userMarkerRef.current?.remove();
        userMarkerRef.current = null;
      }

      if (positions.length > 1) {
        map.fitBounds(L.latLngBounds(positions), { padding: [28, 28], maxZoom: 10 });
      } else if (positions.length === 1) {
        map.setView(positions[0], 10);
      } else {
        map.setView(URUGUAY_CENTER, 6);
      }

      window.requestAnimationFrame(() => map.invalidateSize());
    });
  }, [mapReady, routes, sightings, userLocation]);

  return <div aria-label="Mapa de avistamientos en Uruguay" className="h-full min-h-[380px] w-full" ref={containerRef} role="application" />;
}
