"use client";

import { useEffect, useRef, useState } from "react";
import type { CircleMarker, LayerGroup, Map as LeafletMap, Polyline } from "leaflet";
import { routeName } from "../lib/format";
import { markerColors, riskLabel, riskTone, userMarkerColors } from "../lib/risk";
import type { DashboardRoute, DashboardSighting, LatLng, NavigationMapState } from "../types";

const URUGUAY_CENTER: LatLng = [-34.9, -56.16];

type LeafletMapViewProps = {
  sightings: DashboardSighting[];
  routes: DashboardRoute[];
  userLocation: LatLng | null;
  navigation: NavigationMapState;
  onMapPointSelect: (point: LatLng) => void;
};

/** Contenido del popup armado con DOM para no inyectar HTML con datos del usuario. */
function buildPopup(sighting: DashboardSighting, routes: DashboardRoute[]) {
  const popup = document.createElement("div");
  const title = document.createElement("strong");
  title.textContent = sighting.especie?.nombre ?? "Especie no disponible";

  const details = document.createElement("p");
  details.className = "leaflet-sighting-popup-details";
  const km = sighting.km !== null ? `, km ${sighting.km}` : "";
  const route = sighting.rutaId ? ` · ${routeName(routes, sighting.rutaId)}${km}` : "";
  details.textContent = `${riskLabel(sighting.especie?.nivelRiesgo)}${route}`;

  popup.append(title, details);
  return popup;
}

export default function LeafletMapView({ sightings, routes, userLocation, navigation, onMapPointSelect }: LeafletMapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<LayerGroup | null>(null);
  const userMarkerRef = useRef<CircleMarker | null>(null);
  const originMarkerRef = useRef<CircleMarker | null>(null);
  const destinationMarkerRef = useRef<CircleMarker | null>(null);
  const routeLineRef = useRef<Polyline | null>(null);
  const invalidateFrameRef = useRef<number | null>(null);
  const [mapReady, setMapReady] = useState(false);

  function scheduleInvalidateSize(map: LeafletMap) {
    if (invalidateFrameRef.current !== null) {
      window.cancelAnimationFrame(invalidateFrameRef.current);
    }
    invalidateFrameRef.current = window.requestAnimationFrame(() => {
      invalidateFrameRef.current = null;
      if (mapRef.current === map && containerRef.current?.isConnected) {
        map.invalidateSize();
      }
    });
  }

  // Crear el mapa una sola vez.
  useEffect(() => {
    let disposed = false;

    void import("leaflet").then((L) => {
      if (disposed || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        center: URUGUAY_CENTER,
        zoom: 6,
        scrollWheelZoom: false,
        zoomAnimation: false,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      mapRef.current = map;
      markersRef.current = L.layerGroup().addTo(map);
      setMapReady(true);
      scheduleInvalidateSize(map);
    });

    return () => {
      disposed = true;
      if (invalidateFrameRef.current !== null) {
        window.cancelAnimationFrame(invalidateFrameRef.current);
        invalidateFrameRef.current = null;
      }
      const map = mapRef.current;
      mapRef.current = null;
      markersRef.current = null;
      userMarkerRef.current = null;
      originMarkerRef.current = null;
      destinationMarkerRef.current = null;
      routeLineRef.current = null;
      map?.remove();
    };
  }, []);

  // Redibujar marcadores cuando cambian los datos.
  useEffect(() => {
    if (!mapReady) return;

    void import("leaflet").then((L) => {
      const map = mapRef.current;
      const markerLayer = markersRef.current;
      if (!map || !markerLayer) return;

      markerLayer.clearLayers();
      const positions: LatLng[] = [];

      for (const sighting of sightings) {
        const [longitude, latitude] = sighting.ubicacion.coordinates;
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;

        const position: LatLng = [latitude, longitude];
        positions.push(position);
        const colors = markerColors[riskTone(sighting.especie?.nivelRiesgo)];
        L.circleMarker(position, { radius: 8, color: colors.stroke, weight: 2, fillColor: colors.fill, fillOpacity: 0.9 })
          .bindPopup(buildPopup(sighting, routes))
          .addTo(markerLayer);
      }

      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      if (userLocation) {
        positions.push(userLocation);
        userMarkerRef.current = L.circleMarker(userLocation, {
          radius: 9,
          color: userMarkerColors.stroke,
          weight: 3,
          fillColor: userMarkerColors.fill,
          fillOpacity: 0.9,
        }).bindPopup("Tu ubicación").addTo(map);
      }

      originMarkerRef.current?.remove();
      destinationMarkerRef.current?.remove();
      routeLineRef.current?.remove();
      originMarkerRef.current = null;
      destinationMarkerRef.current = null;
      routeLineRef.current = null;

      if (navigation.origin) {
        originMarkerRef.current = L.circleMarker(navigation.origin, {
          radius: 10,
          color: "#1769aa",
          weight: 3,
          fillColor: "#4aa3df",
          fillOpacity: 0.95,
        }).bindPopup("Punto A · partida").addTo(map);
      }
      if (navigation.destination) {
        destinationMarkerRef.current = L.circleMarker(navigation.destination, {
          radius: 10,
          color: "#a33945",
          weight: 3,
          fillColor: "#d97178",
          fillOpacity: 0.95,
        }).bindPopup("Punto B · llegada").addTo(map);
      }
      if (navigation.route && navigation.route.coordinates.length > 1) {
        routeLineRef.current = L.polyline(navigation.route.coordinates, {
          color: "#287568",
          weight: 6,
          opacity: 0.9,
          lineCap: "round",
          lineJoin: "round",
        }).addTo(map);
      }

      if (navigation.followUser && userLocation) {
        map.panTo(userLocation);
      } else if (navigation.route && navigation.route.coordinates.length) {
        map.fitBounds(L.latLngBounds(navigation.route.coordinates), { padding: [36, 36], maxZoom: 13 });
      } else if (navigation.origin && navigation.destination) {
        map.fitBounds(L.latLngBounds([navigation.origin, navigation.destination]), { padding: [36, 36], maxZoom: 13 });
      } else if (positions.length > 1) {
        map.fitBounds(L.latLngBounds(positions), { padding: [28, 28], maxZoom: 10 });
      } else if (positions.length === 1) {
        map.setView(positions[0], 10);
      } else {
        map.setView(URUGUAY_CENTER, 6);
      }
      scheduleInvalidateSize(map);
    });
  }, [mapReady, navigation.destination, navigation.followUser, navigation.origin, navigation.route, routes, sightings, userLocation]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const onClick = (event: import("leaflet").LeafletMouseEvent) => {
      if (navigation.selectionMode) onMapPointSelect([event.latlng.lat, event.latlng.lng]);
    };
    map.getContainer().style.cursor = navigation.selectionMode ? "crosshair" : "";
    map.on("click", onClick);
    return () => {
      map.off("click", onClick);
      map.getContainer().style.cursor = "";
    };
  }, [mapReady, navigation.selectionMode, onMapPointSelect]);

  return (
    <div aria-label="Mapa de avistamientos y navegación GPS" className="h-full min-h-[28rem] w-full" ref={containerRef} role="application" />
  );
}
