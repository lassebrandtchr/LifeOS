import { Mail } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/dashboard/section-card";
import { mailData, type Tone } from "@/features/dashboard/data";

/** Tone → badge-variant. */
const badgeVariant: Record<Tone, "default" | "secondary" | "success" | "warning"> = {
  neutral: "secondary",
  primary: "default",
  success: "success",
  warning: "warning",
  danger: "warning",
};

/** Mail-kort – arbejde og privat hver for sig (placeholder-data). */
export function MailCard() {
  return (
    <SectionCard title="Mail" icon={Mail} href="/mail">
      <div className="flex flex-col gap-3">
        {mailData.map((box) => (
          <div
            key={box.scope}
            className="rounded-xl border border-border/50 bg-secondary/30 p-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{box.scope}</span>
              <span className="text-sm text-muted-foreground">{box.total}</span>
            </div>
            <div className="mt-2">
              <Badge variant={badgeVariant[box.flagged.tone ?? "neutral"]}>
                {box.flagged.label}: {box.flagged.value}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
