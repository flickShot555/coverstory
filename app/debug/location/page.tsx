"use client";

import { useEffect, useRef, useState } from "react";
import { useGeolocation } from "@/hooks/useGeolocation";
import { reverseGeocode, type Place } from "@/lib/geocoding";
import { getWeather, type Weather } from "@/lib/weather";

export default function LocationDebugPage() {
  const { coords, error: geoError, loading: locating, permissionState, requestLocation } =
    useGeolocation();

  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [place, setPlace] = useState<Place | null>(null);
  const [weather, setWeather] = useState<Weather | null>(null);

  // Avoid running the fetch pipeline twice for the same coordinates.
  const lastKeyRef = useRef<string | null>(null);

  // Once the hook resolves coordinates, reverse geocode + fetch weather.
  useEffect(() => {
    if (!coords) return;
    const key = `${coords.latitude},${coords.longitude}`;
    if (lastKeyRef.current === key) return;
    lastKeyRef.current = key;

    const controller = new AbortController();
    setFetching(true);
    setFetchError(null);
    setPlace(null);
    setWeather(null);

    Promise.all([
      reverseGeocode(coords.latitude, coords.longitude, controller.signal),
      getWeather(coords.latitude, coords.longitude, controller.signal),
    ])
      .then(([placeResult, weatherResult]) => {
        setPlace(placeResult);
        setWeather(weatherResult);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setFetchError(
          err instanceof Error ? err.message : "Failed to fetch weather data."
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setFetching(false);
      });

    return () => controller.abort();
  }, [coords]);

  const handleClick = () => {
    lastKeyRef.current = null;
    setFetchError(null);
    setPlace(null);
    setWeather(null);
    requestLocation();
  };

  const busy = locating || fetching;
  const error = geoError ?? fetchError;
  const showResult = place && weather && !busy && !error;

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-bold">Location &amp; Weather — Debug</h1>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          Geolocation → reverse geocoding → weather, all client-side.
          <br />
          Permission state:{" "}
          <span className="font-mono">{permissionState}</span>
        </p>
      </div>

      <button
        onClick={handleClick}
        disabled={busy}
        className="w-fit rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {busy ? "Working…" : "Get my location"}
      </button>

      <div className="text-sm" aria-live="polite">
        {locating && <p>Requesting your location…</p>}
        {fetching && <p>Fetching place and weather…</p>}

        {error && !busy && (
          <p className="rounded-md bg-red-500/10 p-3 text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        {showResult && (
          <div className="space-y-4">
            <p className="text-base">
              You&apos;re in <strong>{place!.city}</strong>, {place!.country}.
              It&apos;s <strong>{Math.round(weather!.tempC)}°C</strong> and{" "}
              <strong>{weather!.condition}</strong> right now (
              {weather!.isDay ? "day" : "night"}).
            </p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-xs text-black/70 dark:text-white/70">
              <dt>city</dt>
              <dd>{place!.city}</dd>
              <dt>country</dt>
              <dd>
                {place!.country} ({place!.countryCode || "—"})
              </dd>
              <dt>tempC</dt>
              <dd>{weather!.tempC}</dd>
              <dt>condition</dt>
              <dd>
                {weather!.condition} (WMO {weather!.weatherCode})
              </dd>
              <dt>isDay</dt>
              <dd>{String(weather!.isDay)}</dd>
              <dt>windSpeed</dt>
              <dd>{weather!.windSpeed} km/h</dd>
              <dt>coords</dt>
              <dd>
                {coords!.latitude.toFixed(4)}, {coords!.longitude.toFixed(4)}
              </dd>
            </dl>
          </div>
        )}
      </div>
    </main>
  );
}
