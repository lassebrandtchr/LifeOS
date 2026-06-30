import { ListChecks } from "lucide-react";

import { SectionCard, StatLine } from "@/components/dashboard/section-card";
import { tasksData } from "@/features/dashboard/data";

/** Opgaver-kort – mine opgaver fordelt på hvornår de skal løses. */
export function TasksCard() {
  return (
    <SectionCard title="Mine opgaver" icon={ListChecks} href="/opgaver">
      <div className="flex flex-col">
        {tasksData.map((item) => (
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
