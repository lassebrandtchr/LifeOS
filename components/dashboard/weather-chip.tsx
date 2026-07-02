import { weatherFromCode, type WeatherSnapshot } from "@/lib/weather/types";

/**
 * Lille vejr-pille til "Godformiddag, Lasse"-headeren. Samme glas-stil som
 * "Arbejdstid"-badgen (ring + backdrop-blur), bare mindre og med to i
 * forlængelse af hinanden (Bramming + Ribe).
 */
export function WeatherChip({
  label,
  snapshot,
}: {
  label: string;
  snapshot: WeatherSnapshot | null;
}) {
  if (!snapshot) return null;
  const { emoji, label: weatherLabel } = weatherFromCode(snapshot.code, snapshot.isDay);

  return (
    <div
      title={`${label}: ${weatherLabel}, ${snapshot.tempC}°`}
      className="flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/90 ring-1 ring-white/15 backdrop-blur-md"
    >
      <span aria-hidden>{emoji}</span>
      <span className="font-semibold tabular-nums">{snapshot.tempC}°</span>
      <span className="text-white/70">{label}</span>
    </div>
  );
}
