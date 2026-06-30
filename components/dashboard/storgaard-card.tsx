import { Car } from "lucide-react";

import { SectionCard, StatLine } from "@/components/dashboard/section-card";
import { storgaardData } from "@/features/dashboard/data";

/** Storgaard Biler-kort – overblik over arbejdsverdenen (placeholder-data). */
export function StorgaardCard() {
  return (
    <SectionCard title="Storgaard Biler" icon={Car} href="/storgaard-biler">
      <div className="flex flex-col">
        {storgaardData.map((item) => (
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
