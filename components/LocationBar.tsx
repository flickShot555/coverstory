"use client";

import { conditionEmoji } from "@/lib/weather";
import type { LocationWeather } from "@/hooks/useLocationWeather";

/** Compact location + weather strip shown at the top of the home content. */
export function LocationBar({ place, weather, loading, unavailable }: LocationWeather) {
  if (loading) {
    return (
      <p className="text-sm text-black/50 dark:text-white/50">
        Detecting location…
      </p>
    );
  }

  if (unavailable || !place || !weather) {
    return (
      <p className="text-sm text-black/50 dark:text-white/50">
        📍 Location unavailable — excuses will be a little less local.
      </p>
    );
  }

  return (
    <p className="text-sm font-medium">
      📍 {place.city} · {conditionEmoji(weather.condition)} {weather.condition} ·{" "}
      {Math.round(weather.tempC)}°C
    </p>
  );
}
