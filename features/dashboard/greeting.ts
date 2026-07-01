import { isWorkHours as computeIsWorkHours } from "@/features/tasks/section-order";

export type GreetingResult = {
  text: string;
  emoji: string;
  period: "morgen" | "dag" | "aften" | "nat";
  isWorkHours: boolean;
  periodLabel: string;
};

export function getGreeting(date: Date = new Date()): GreetingResult {
  const hour = date.getHours();
  // Arbejdstid defineres ét sted (features/tasks/section-order.ts), så hele
  // appen er enig om hvornår det er arbejde vs. privat.
  const isWorkHours = computeIsWorkHours(date);

  if (hour < 10)
    return { text: "Godmorgen", emoji: "☀️", period: "morgen", isWorkHours, periodLabel: isWorkHours ? "Arbejdstid" : "Morgen" };
  if (hour < 17)
    return { text: "Goddag", emoji: "👋", period: "dag", isWorkHours, periodLabel: isWorkHours ? "Arbejdstid" : "Dag" };
  if (hour < 22)
    return { text: "Godaften", emoji: "🌙", period: "aften", isWorkHours, periodLabel: "Aftenstid" };
  return { text: "God nat", emoji: "💤", period: "nat", isWorkHours, periodLabel: "Natten" };
}
