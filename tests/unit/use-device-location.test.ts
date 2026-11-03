// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getDeviceLocation } from "@/app/dashboard/lib/geolocation";
import { DEVICE_LOCATION_TTL_MS, useDeviceLocation } from "@/app/dashboard/hooks/use-device-location";

vi.mock("@/app/dashboard/lib/geolocation", () => ({
  getDeviceLocation: vi.fn(),
}));

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("useDeviceLocation", () => {
  it("borra la ubicación de inmediato al cambiar de cuenta", async () => {
    vi.mocked(getDeviceLocation).mockResolvedValue([-34.5, -56.2]);
    const { result } = renderHook(() => useDeviceLocation());

    await act(async () => {
      await result.current.locate();
    });
    expect(result.current.location).toEqual([-34.5, -56.2]);

    act(() => {
      result.current.clearLocation();
    });
    expect(result.current.location).toBeNull();
  });

  it("ignora una ubicación cuya solicitud se completó después del cierre de sesión", async () => {
    let resolveLocation: (coords: [number, number]) => void = () => {};
    vi.mocked(getDeviceLocation).mockReturnValue(new Promise((resolve) => {
      resolveLocation = resolve;
    }));
    const { result } = renderHook(() => useDeviceLocation());

    let locatePromise: Promise<[number, number] | null>;
    act(() => {
      locatePromise = result.current.locate();
    });
    act(() => {
      result.current.clearLocation();
      resolveLocation([-34.5, -56.2]);
    });
    await act(async () => {
      await locatePromise;
    });

    expect(result.current.location).toBeNull();
  });

  it("borra la ubicación de la sesión después de dos minutos", async () => {
    vi.useFakeTimers();
    vi.mocked(getDeviceLocation).mockResolvedValue([-34.5, -56.2]);
    const { result, unmount } = renderHook(() => useDeviceLocation());

    await act(async () => {
      await result.current.locate();
    });

    expect(result.current.location).toEqual([-34.5, -56.2]);

    act(() => {
      vi.advanceTimersByTime(DEVICE_LOCATION_TTL_MS - 1);
    });
    expect(result.current.location).toEqual([-34.5, -56.2]);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.location).toBeNull();

    unmount();
  });
});
