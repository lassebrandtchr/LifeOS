"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { syncGoogleCalendar } from "@/features/integrations/actions";

/**
 * Synkronisér-knap DIREKTE på kalendersiden.
 *
 * Tidligere lå den eneste sync-knap under Indstillinger, så "tryk synkronisér"
 * på selve kalendersiden gjorde ingenting. Denne knap kalder den samme
 * server-action og giver ALTID tydelig besked (grøn med antal, eller rød med
 * årsag) + genindlæser siden, så nye aftaler dukker op med det samme.
 */
export function CalendarSyncButton({
  variant = "solid",
  className,
}: {
  variant?: "solid" | "outline";
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function run() {
    startTransition(async () => {
      try {
        const res = await syncGoogleCalendar();
        if (res?.error) {
          toast.error(res.error, { duration: 9000 });
        } else {
          toast.success(res?.message ?? "Kalender synkroniseret ✓");
          router.refresh();
        }
      } catch {
        toast.error("Kunne ikke synkronisere – tjek din forbindelse og prøv igen.");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={pending}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors disabled:opacity-60",
        variant === "solid"
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : "border border-border/60 bg-secondary/40 hover:bg-secondary",
        className,
      )}
    >
      <RefreshCw className={cn("size-4", pending && "animate-spin")} />
      {pending ? "Synkroniserer …" : "Synkronisér"}
    </button>
  );
}
