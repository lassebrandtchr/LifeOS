import { Activity } from "lucide-react";

import { SectionCard } from "@/components/dashboard/section-card";
import { dailyStatus } from "@/features/dashboard/data";

/** Dagens status – hvor langt du er nået i dag (placeholder-data). */
export function StatusCard() {
  return (
    <SectionCard title="Dagens status" icon={Activity}>
      <div className="flex flex-col">
        {dailyStatus.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between gap-3 border-b border-border/50 py-2.5 last:border-0"
          >
            <span className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <span aria-hidden className="text-base">
                {item.emoji}
              </span>
              {item.label}
            </span>
            <span className="text-sm font-semibold">{item.value}</span>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
