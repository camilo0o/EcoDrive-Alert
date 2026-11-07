export type RiskTone = "high" | "medium" | "low" | "unknown";

export function riskTone(risk: string | undefined): RiskTone {
  if (risk === "ALTO") return "high";
  if (risk === "MEDIO") return "medium";
  if (risk === "BAJO") return "low";
  return "unknown";
}

export function riskLabel(risk: string | undefined) {
  if (risk === "ALTO") return "Riesgo alto";
  if (risk === "MEDIO") return "Riesgo medio";
  if (risk === "BAJO") return "Riesgo bajo";
  return "Sin clasificar";
}

/** Clases de Tailwind para el badge de riesgo. */
export const riskBadgeStyles: Record<RiskTone, string> = {
  high: "bg-danger-tint text-danger-soft",
  medium: "bg-warning-tint text-warning",
  low: "bg-brand-wash text-brand",
  unknown: "bg-brand-wash text-muted",
};

/**
 * Colores de los marcadores del mapa. Leaflet no entiende clases ni variables CSS,
 * así que van en hex. Son los mismos valores que los tokens de globals.css.
 */
export const markerColors: Record<RiskTone, { stroke: string; fill: string }> = {
  high: { stroke: "#a33945", fill: "#d97178" }, // danger / danger-map
  medium: { stroke: "#947a43", fill: "#e2bb67" }, // warning / warning-map
  low: { stroke: "#20534a", fill: "#64a885" }, // brand / brand-soft
  unknown: { stroke: "#667085", fill: "#b8c0cc" },
};

export const userMarkerColors = { stroke: "#1769aa", fill: "#4aa3df" }; // info / info-soft
