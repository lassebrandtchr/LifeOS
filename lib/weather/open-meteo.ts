import "server-only";

import type { WeatherSnapshot } from "@/lib/weather/types";

/**
 * Vejr via Open-Meteo (open-meteo.com) – gratis, ingen API-nøgle nødvendig.
 * Bruges KUN til forsidens to små vejrwidgets (Bramming + Ribe).
 *
 * Next.js' fetch-cache (`next: { revalidate }`) sørger for, at vi højst
 * henter nyt vejr én gang i timen pr. by, uanset hvor mange gange forsiden
 * genindlæses – "opdaterer hver time" uden noget ekstra cron-job.
 */

export const WEATHER_LOCATIONS = {
  bramming: { lat: 55.4667, lon: 8.7167, label: "Bramming" },
  ribe: { lat: 55.3336, lon: 8.7667, label: "Ribe" },
} as const;

export type LocationKey = keyof typeof WEATHER_LOCATIONS;

export async function getWeather(key: LocationKey): Promise<WeatherSnapshot | null> {
  const { lat, lon } = WEATHER_LOCATIONS[key];
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day&timezone=Europe%2FCopenhagen`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const data = await res.json();
    const current = data?.current;
    if (!current || typeof current.temperature_2m !== "number") return null;
    return {
      tempC: Math.round(current.temperature_2m),
      code: current.weather_code ?? 0,
      isDay: current.is_day === 1,
    };
  } catch {
    return null;
  }
}

export async function getAllWeather(): Promise<Record<LocationKey, WeatherSnapshot | null>> {
  const [bramming, ribe] = await Promise.all([
    getWeather("bramming"),
    getWeather("ribe"),
  ]);
  return { bramming, ribe };
}
