import { describe, expect, it } from "vitest";
import { getRouteProgress } from "@/app/dashboard/lib/route-progress";

describe("getRouteProgress", () => {
  const route: [number, number][] = [
    [-34.9, -56.1],
    [-34.9, -55.5],
    [-34.9, -54.9],
  ];

  it("calcula avance y distancia restante proyectando el GPS sobre el recorrido", () => {
    const progress = getRouteProgress(route, [-34.9, -55.5]);
    expect(progress).not.toBeNull();
    expect(progress?.progressPercent).toBe(50);
    expect(progress?.remainingMeters).toBeCloseTo(progress!.totalMeters / 2, 0);
    expect(progress?.distanceFromRouteMeters).toBeLessThan(1);
  });

  it("devuelve null si el recorrido no contiene un segmento", () => {
    expect(getRouteProgress([[-34.9, -56.1]], [-34.9, -56.1])).toBeNull();
  });
});
