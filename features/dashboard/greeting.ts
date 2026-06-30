export type GreetingResult = {
  text: string;
  emoji: string;
  period: "morgen" | "dag" | "aften" | "nat";
  isWorkHours: boolean;
  periodLabel: string;
};

export function getGreeting(date: Date = new Date()): GreetingResult {
  const hour = date.getHours();
  const dow = date.getDay(); // 0=Sun … 6=Sat
  const isWeekday = dow >= 1 && dow <= 5;
  // Arbejdstid: hverdage 09:00–17:00. Privattid (aftenoverblik): 17:00 → 09:00.
  const isWorkHours = isWeekday && hour >= 9 && hour < 17;

  if (hour < 10)
    return { text: "Godmorgen", emoji: "☀️", period: "morgen", isWorkHours, periodLabel: isWorkHours ? "Arbejdstid" : "Morgen" };
  if (hour < 17)
    return { text: "Goddag", emoji: "👋", period: "dag", isWorkHours, periodLabel: isWorkHours ? "Arbejdstid" : "Dag" };
  if (hour < 22)
    return { text: "Godaften", emoji: "🌙", period: "aften", isWorkHours, periodLabel: "Aftenstid" };
  return { text: "God nat", emoji: "💤", period: "nat", isWorkHours, periodLabel: "Natten" };
}
