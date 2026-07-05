import {
  Sun,
  Moon,
  Cloud,
  CloudSun,
  CloudRain,
  CloudDrizzle,
  CloudFog,
  CloudSnow,
  CloudLightning,
  Thermometer,
  type LucideIcon,
} from "lucide-react";

interface WeatherIconProps {
  condition: string;
  isDay?: boolean;
  className?: string;
}

/** Maps a weather condition label to the appropriate Lucide icon. */
export function WeatherIcon({ condition, isDay = true, className }: WeatherIconProps) {
  const map: Record<string, LucideIcon> = {
    clear: isDay ? Sun : Moon,
    "partly cloudy": CloudSun,
    cloudy: Cloud,
    fog: CloudFog,
    drizzle: CloudDrizzle,
    rain: CloudRain,
    showers: CloudRain,
    snow: CloudSnow,
    thunderstorm: CloudLightning,
  };
  const Icon = map[condition] ?? Thermometer;
  return <Icon className={className} aria-hidden />;
}
