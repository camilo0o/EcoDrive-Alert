import { describe, expect, it } from "vitest";
import { necesitaRiesgo } from "@/app/dashboard/lib/voz";
import type { VoiceSpecies } from "@/app/dashboard/types";

const base: VoiceSpecies = {
  especieId: null,
  inaturalistTaxonId: 1,
  nombre: "Ñandú",
  nombreCientifico: "Rhea americana",
  nivelRiesgo: null,
  fotoReferencia: null,
};

describe("necesitaRiesgo", () => {
  it("pide el riesgo para una especie nueva de iNaturalist", () => {
    expect(necesitaRiesgo(base)).toBe(true);
  });

  it("lo vuelve a pedir si quedó SIN_CLASIFICAR", () => {
    expect(necesitaRiesgo({ ...base, especieId: "abc", nivelRiesgo: "SIN_CLASIFICAR" })).toBe(true);
  });

  it("no lo pide si la especie ya tiene nivel", () => {
    expect(necesitaRiesgo({ ...base, especieId: "abc", nivelRiesgo: "ALTO" })).toBe(false);
  });

  it("no lo pide para especies locales sin taxón (no hay cómo clasificarlas por esta vía)", () => {
    expect(necesitaRiesgo({ ...base, especieId: "abc", inaturalistTaxonId: null, nivelRiesgo: "SIN_CLASIFICAR" })).toBe(false);
  });
});
