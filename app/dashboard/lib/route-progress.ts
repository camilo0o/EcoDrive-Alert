import type { LatLng } from "../types";

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function distanceMeters(a: LatLng, b: LatLng) {
  const earthRadiusMeters = 6_371_000;
  const deltaLat = toRadians(b[0] - a[0]);
  const deltaLng = toRadians(b[1] - a[1]);
  const value =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(a[0])) * Math.cos(toRadians(b[0])) * Math.sin(deltaLng / 2) ** 2;
  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

/** Proyecta el GPS sobre el segmento más cercano del recorrido y calcula el avance aproximado. */
export function getRouteProgress(route: LatLng[], location: LatLng) {
  if (route.length < 2) return null;

  const referenceLatitude = location[0];
  const xScale = 111_320 * Math.cos(toRadians(referenceLatitude));
  const yScale = 111_320;
  const px = location[1] * xScale;
  const py = location[0] * yScale;
  let totalMeters = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  let bestAlongMeters = 0;

  for (let index = 1; index < route.length; index += 1) {
    const start = route[index - 1];
    const end = route[index];
    const ax = start[1] * xScale;
    const ay = start[0] * yScale;
    const bx = end[1] * xScale;
    const by = end[0] * yScale;
    const dx = bx - ax;
    const dy = by - ay;
    const segmentLength = distanceMeters(start, end);
    const squaredLength = dx * dx + dy * dy;
    const ratio = squaredLength === 0
      ? 0
      : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / squaredLength));
    const projectedX = ax + ratio * dx;
    const projectedY = ay + ratio * dy;
    const distanceToSegment = Math.hypot(px - projectedX, py - projectedY);

    if (distanceToSegment < bestDistance) {
      bestDistance = distanceToSegment;
      bestAlongMeters = totalMeters + segmentLength * ratio;
    }
    totalMeters += segmentLength;
  }

  if (totalMeters <= 0) return null;
  const alongMeters = Math.min(totalMeters, bestAlongMeters);
  return {
    totalMeters,
    alongMeters,
    remainingMeters: Math.max(0, totalMeters - alongMeters),
    progressPercent: Math.round((alongMeters / totalMeters) * 100),
    distanceFromRouteMeters: bestDistance,
  };
}
