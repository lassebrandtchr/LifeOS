/**
 * Delte, rene vejr-typer/-hjælpere UDEN "server-only" – denne fil må gerne
 * importeres af klient-komponenter (fx weather-chip.tsx). Selve
 * hentningen (fetch mod Open-Meteo) ligger i open-meteo.ts, som ER
 * server-only og ALDRIG må havne i klient-bundlen.
 */

export type WeatherSnapshot = {
  tempC: number;
  code: number; // WMO weather code
  isDay: boolean;
};

/** WMO weather-kode → emoji + kort dansk beskrivelse (til title/tooltip). */
export function weatherFromCode(code: number, isDay: boolean): { emoji: string; label: string } {
  if (code === 0) return isDay ? { emoji: "☀️", label: "Klart" } : { emoji: "🌙", label: "Klart" };
  if (code === 1 || code === 2) return isDay ? { emoji: "🌤️", label: "Let skyet" } : { emoji: "☁️", label: "Let skyet" };
  if (code === 3) return { emoji: "☁️", label: "Overskyet" };
  if (code === 45 || code === 48) return { emoji: "🌫️", label: "Tåge" };
  if ([51, 53, 55, 56, 57].includes(code)) return { emoji: "🌦️", label: "Støvregn" };
  if ([61, 63, 65, 66, 67].includes(code)) return { emoji: "🌧️", label: "Regn" };
  if ([71, 73, 75, 77].includes(code)) return { emoji: "🌨️", label: "Sne" };
  if ([80, 81, 82].includes(code)) return { emoji: "🌦️", label: "Byger" };
  if (code === 85 || code === 86) return { emoji: "🌨️", label: "Snebyger" };
  if (code === 95 || code === 96 || code === 99) return { emoji: "⛈️", label: "Torden" };
  return { emoji: "🌡️", label: "Vejr" };
}
