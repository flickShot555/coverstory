"use client";

import { LoaderCircle, MapPin } from "lucide-react";
import { WeatherIcon } from "./WeatherIcon";
import type { Place } from "@/lib/geocoding";
import type { Weather } from "@/lib/weather";

interface LocationBarProps {
  place: Place | null;
  weather: Weather | null;
  /** Confirming = still resolving location/weather this session. */
  confirming: boolean;
  /** Signed-out hint (no profile to store location against yet). */
  signedOut?: boolean;
}

/** Compact location + weather strip at the top of the home content. */
export function LocationBar({ place, weather, confirming, signedOut }: LocationBarProps) {
  const base =
    "flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm";

  if (signedOut) {
    return (
      <div className={`${base} text-muted`}>
        <MapPin className="h-4 w-4" aria-hidden />
        Sign in to set your location
      </div>
    );
  }

  if (!place || !weather) {
    return (
      <div className={`${base} text-muted`}>
        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
        {confirming ? "Confirming your location…" : "Detecting location…"}
      </div>
    );
  }

  return (
    <div className={`${base} font-medium`}>
      <MapPin className="h-4 w-4 text-accent" aria-hidden />
      <span>{place.city}</span>
      <span className="text-border">·</span>
      <WeatherIcon
        condition={weather.condition}
        isDay={weather.isDay}
        className="h-4 w-4 text-muted"
      />
      <span className="capitalize">{weather.condition}</span>
      <span className="text-border">·</span>
      <span>{Math.round(weather.tempC)}°C</span>
    </div>
  );
}
