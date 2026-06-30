import { Target } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import {
  focusTasks,
  focusHighlights,
  type Tone,
} from "@/features/dashboard/data";

/** Tone → farve på prik/markering. */
const dotClass: Record<Tone, string> = {
  neutral: "bg-muted-foreground",
  primary: "bg-primary",
  warning: "bg-warning",
  success: "bg-success",
  danger: "bg-destructive",
};

/**
 * FocusCard – "Dagens fokus". Det mest prominente kort på dashboardet:
 * de 3 vigtigste opgaver + det vigtigste der haster lige nu.
 */
export function FocusCard() {
  return (
    <Card
      interactive
      className="group relative h-full overflow-hidden border-primary/20"
    >
      {/* Diskret blåt skær så kortet føles vigtigst */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-primary/10 blur-3xl"
      />
      <CardContent className="flex h-full flex-col gap-5 p-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-glow transition-transform duration-200 ease-out group-hover:scale-105">
            <Target className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Dagens fokus</h2>
            <p className="text-sm text-muted-foreground">
              Det vigtigste at handle på lige nu
            </p>
          </div>
        </div>

        <div className="grid flex-1 gap-5 md:grid-cols-2">
          {/* De 3 vigtigste opgaver */}
          <ol className="flex flex-col gap-3">
            {focusTasks.map((task, i) => (
              <li key={task.title} className="flex items-start gap-3">
                <span className="mt-0.5 text-sm font-semibold text-muted-foreground">
                  {i + 1}
                </span>
                <span
                  className={cn(
                    "mt-1.5 size-2 shrink-0 rounded-full",
                    dotClass[task.tone],
                  )}
                />
                <span className="text-sm font-medium leading-snug">
                  {task.title}
                </span>
              </li>
            ))}
          </ol>

          {/* Highlights (haster / næste aftale / opfølgninger) */}
          <div className="flex flex-col gap-3">
            {focusHighlights.map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-border/60 bg-secondary/40 p-3"
              >
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p
                  className={cn(
                    "mt-0.5 font-semibold",
                    item.tone === "danger" && "text-destructive",
                    item.tone === "warning" && "text-warning",
                    item.tone === "primary" && "text-primary",
                  )}
                >
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
