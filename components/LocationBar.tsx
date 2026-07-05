"use client";

import { MapPin } from "lucide-react";
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
    "inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm backdrop-blur-sm";

  if (signedOut) {
    return (
      <div className={`${base} text-white/60`}>
        <MapPin className="h-4 w-4" aria-hidden />
        Sign in to set your location
      </div>
    );
  }

  if (!place || !weather) {
    return (
      <div className={`${base} text-white/70`}>
        <MapPin className="h-4 w-4 animate-pulse text-accent" aria-hidden />
        {confirming ? "Confirming your location…" : "Detecting location…"}
      </div>
    );
  }

  return (
    <div className={`${base} font-medium text-white`}>
      <MapPin className="h-4 w-4 text-accent" aria-hidden />
      <span>{place.city}</span>
      <span className="text-white/25">·</span>
      <WeatherIcon
        condition={weather.condition}
        isDay={weather.isDay}
        className="h-4 w-4 text-white/70"
      />
      <span className="capitalize">{weather.condition}</span>
      <span className="text-white/25">·</span>
      <span>{Math.round(weather.tempC)}°C</span>
    </div>
  );
}
