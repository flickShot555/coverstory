"use client";

import { useEffect, useRef, useState } from "react";
import { useGeolocation, type Coords } from "./useGeolocation";
import { reverseGeocode, type Place } from "@/lib/geocoding";
import { getWeather, type Weather } from "@/lib/weather";

export interface LocationWeather {
  place: Place | null;
  weather: Weather | null;
  coords: Coords | null;
  /** Still detecting location or fetching data. */
  loading: boolean;
  /** Permission denied / unsupported / fetch failed — proceed without hyperlocal data. */
  unavailable: boolean;
  error: string | null;
}

/**
 * Auto-requests geolocation on mount, then reverse-geocodes and fetches weather
 * in parallel. This is the home-screen convenience wrapper around Layer 1.
 */
export function useLocationWeather(): LocationWeather {
  const { coords, error: geoError, permissionState, requestLocation } =
    useGeolocation();

  const [place, setPlace] = useState<Place | null>(null);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Kick off the permission prompt once on mount (core mechanic, not a gate).
  const requested = useRef(false);
  useEffect(() => {
    if (requested.current) return;
    requested.current = true;
    requestLocation();
  }, [requestLocation]);

  // When coordinates arrive, resolve place + weather together.
  useEffect(() => {
    if (!coords) return;
    let cancelled = false;
    setFetchError(null);

    Promise.all([
      reverseGeocode(coords.latitude, coords.longitude),
      getWeather(coords.latitude, coords.longitude),
    ])
      .then(([placeResult, weatherResult]) => {
        if (cancelled) return;
        setPlace(placeResult);
        setWeather(weatherResult);
      })
      .catch((err) => {
        if (cancelled) return;
        setFetchError(
          err instanceof Error ? err.message : "Couldn't load local conditions."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [coords]);

  const ready = !!place && !!weather;
  const settledUnavailable =
    !!geoError || !!fetchError || permissionState === "unsupported";

  return {
    place,
    weather,
    coords,
    loading: !ready && !settledUnavailable,
    unavailable: settledUnavailable && !ready,
    error: geoError ?? fetchError,
  };
}
