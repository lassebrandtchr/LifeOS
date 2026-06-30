import { Home } from "lucide-react";

import { SectionCard, StatLine } from "@/components/dashboard/section-card";
import { tangevejData } from "@/features/dashboard/data";

/** Tangevej 94-kort – overblik over privatverdenen (placeholder-data). */
export function TangevejCard() {
  return (
    <SectionCard title="Tangevej 94" icon={Home} href="/privat">
      <div className="flex flex-col">
        {tangevejData.map((item) => (
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
