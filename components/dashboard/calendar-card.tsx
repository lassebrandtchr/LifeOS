import { Calendar } from "lucide-react";

import { SectionCard, StatLine } from "@/components/dashboard/section-card";
import { calendarData } from "@/features/dashboard/data";

/** Kalender-kort – dagens og ugens aftaler (placeholder-data). */
export function CalendarCard() {
  return (
    <SectionCard title="Kalender" icon={Calendar} href="/kalender">
      <div className="flex flex-col">
        {calendarData.map((item) => (
          <StatLine
            key={item.label}
            label={item.label}
            value={item.value}
            tone={item.tone}
          />
        ))}
      </div>
    </SectionCard>
  );
}
