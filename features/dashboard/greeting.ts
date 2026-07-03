import { isWorkHours as computeIsWorkHours, copenhagenClock } from "@/features/tasks/section-order";

export type GreetingResult = {
  text: string;
  emoji: string;
  period: "morgen" | "formiddag" | "eftermiddag" | "aften" | "nat";
  isWorkHours: boolean;
  periodLabel: string;
};

/**
 * Hilsen-tekst efter klokkeslæt (dansk):
 *  05.00–10.00  Godmorgen
 *  10.01–12.00  Godformiddag
 *  12.01–17.00  Godeftermiddag
 *  17.01–24.00  Godaften
 *  00.00–04.59  God nat (uden for det oplyste spænd – ingen er vågne endnu)
 */
export function getGreeting(date: Date = new Date()): GreetingResult {
  // Dansk klokkeslæt – IKKE serverens (Vercel kører i UTC, se section-order.ts).
  const { hour } = copenhagenClock(date);
  // Arbejdstid defineres ét sted (features/tasks/section-order.ts), så hele
  // appen er enig om hvornår det er arbejde vs. privat.
  const isWorkHours = computeIsWorkHours(date);

  if (hour < 5)
    return { text: "God nat", emoji: "💤", period: "nat", isWorkHours, periodLabel: "Natten" };
  if (hour <= 10)
    return { text: "Godmorgen", emoji: "☀️", period: "morgen", isWorkHours, periodLabel: isWorkHours ? "Arbejdstid" : "Morgen" };
  if (hour <= 12)
    return { text: "Godformiddag", emoji: "🌤️", period: "formiddag", isWorkHours, periodLabel: isWorkHours ? "Arbejdstid" : "Formiddag" };
  if (hour <= 17)
    return { text: "Godeftermiddag", emoji: "👋", period: "eftermiddag", isWorkHours, periodLabel: isWorkHours ? "Arbejdstid" : "Eftermiddag" };
  return { text: "Godaften", emoji: "🌙", period: "aften", isWorkHours, periodLabel: "Aftenstid" };
}
