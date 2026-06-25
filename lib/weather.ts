// Weather fetch for Coverstory.
// Uses Open-Meteo's free forecast API — no API key required.
// Docs: https://open-meteo.com/en/docs

export type WeatherCondition =
  | "clear"
  | "partly cloudy"
  | "cloudy"
  | "fog"
  | "drizzle"
  | "rain"
  | "snow"
  | "showers"
  | "thunderstorm"
  | "unknown";

export interface Weather {
  tempC: number;
  condition: WeatherCondition;
  isDay: boolean;
  windSpeed: number;
  /** Raw WMO weather interpretation code, kept for debugging / richer UI later. */
  weatherCode: number;
}

interface OpenMeteoResponse {
  current?: {
    temperature_2m?: number;
    weather_code?: number;
    is_day?: number;
    wind_speed_10m?: number;
  };
}

const ENDPOINT = "https://api.open-meteo.com/v1/forecast";

/**
 * Map a WMO weather interpretation code to a simple condition label.
 * See https://open-meteo.com/en/docs for the full code table.
 */
export function describeWeatherCode(code: number): WeatherCondition {
  if (code === 0) return "clear";
  if (code === 1 || code === 2) return "partly cloudy";
  if (code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if (code >= 51 && code <= 57) return "drizzle";
  if (code >= 61 && code <= 67) return "rain";
  if (code >= 71 && code <= 77) return "snow";
  if (code >= 80 && code <= 82) return "showers";
  if (code === 85 || code === 86) return "snow";
  if (code >= 95 && code <= 99) return "thunderstorm";
  return "unknown";
}

/** Fetch current weather conditions for a latitude/longitude. */
export async function getWeather(
  latitude: number,
  longitude: number,
  signal?: AbortSignal
): Promise<Weather> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: "temperature_2m,weather_code,is_day,wind_speed_10m",
  });

  const res = await fetch(`${ENDPOINT}?${params.toString()}`, { signal });
  if (!res.ok) {
    throw new Error(`Weather fetch failed (HTTP ${res.status}).`);
  }

  const data = (await res.json()) as OpenMeteoResponse;
  const current = data.current;
  if (!current || current.temperature_2m === undefined) {
    throw new Error("Weather data was incomplete.");
  }

  const weatherCode = current.weather_code ?? -1;

  return {
    tempC: current.temperature_2m,
    condition: describeWeatherCode(weatherCode),
    isDay: current.is_day === 1,
    windSpeed: current.wind_speed_10m ?? 0,
    weatherCode,
  };
}
