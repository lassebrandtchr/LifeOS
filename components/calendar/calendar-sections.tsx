"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Calendar as CalendarIcon, Settings2, MapPin, Sparkles, AlignLeft } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatTime, dayKey, formatDayHeading } from "@/lib/date";
import { getWorkspaceOrder } from "@/features/tasks/section-order";
import { CalendarEventDetail } from "@/components/calendar/event-detail";
import type { Workspace } from "@/features/tasks/constants";
import type { CalendarEventItem } from "@/features/integrations/types";

/** Har begivenheden noget, der er værd at åbne for (noter/sted)? */
function hasDetail(event: CalendarEventItem): boolean {
  return Boolean(event.description?.trim() || event.location?.trim());
}

const META: Record<Workspace, { emoji: string; label: string }> = {
  work: { emoji: "🚗", label: "Storgaard Biler" },
  private: { emoji: "🏠", label: "Privat" },
};

/** Diskret, tema-tilpasset baggrundstone pr. verden (matcher Opgaver). */
function tint(workspace: Workspace) {
  const accent = workspace === "work" ? "var(--brand)" : "var(--accent-private)";
  return {
    backgroundColor: `color-mix(in oklab, ${accent} 6%, var(--card))`,
    borderColor: `color-mix(in oklab, ${accent} 22%, var(--border))`,
  };
}

function EventRow({ event }: { event: CalendarEventItem }) {
  const isWork = event.workspace === "work";
  const [open, setOpen] = React.useState(false);
  const openable = hasDetail(event);

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      // Hele rækken kan klikkes → åbner begivenheden med noter/beskrivelse.
      className="flex w-full items-stretch gap-3 py-3 text-left transition-colors hover:bg-secondary/40 focus:outline-none focus-visible:bg-secondary/40"
    >
      <div className="w-16 shrink-0 pt-0.5 text-right">
        {event.allDay ? (
          <span className="text-xs text-muted-foreground">Hele dagen</span>
        ) : (
          <>
            <p className="text-sm font-semibold leading-tight">{formatTime(event.startsAt)}</p>
            <p className="text-xs text-muted-foreground">{formatTime(event.endsAt)}</p>
          </>
        )}
      </div>

      <span
        aria-hidden
        className={cn("w-1 shrink-0 rounded-full", isWork ? "bg-primary" : "bg-fuchsia-400/70")}
      />

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 font-medium">
          <span className="truncate">{event.title}</span>
          {/* Note-markør: viser ved et blik hvilke begivenheder der har noter. */}
          {openable && event.description?.trim() && (
            <AlignLeft className="size-3.5 shrink-0 text-muted-foreground" />
          )}
        </p>
        {event.location && (
          <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3" />
            {event.location}
          </span>
        )}
      </div>

      {open && <CalendarEventDetail event={event} onClose={() => setOpen(false)} />}

      {event.source === "lifeos" ? (
        <span
          aria-hidden
          title="Oprettet i LifeOS"
          className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary"
        >
          <Sparkles className="size-4" />
        </span>
      ) : (
        <span
          aria-hidden
          className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-white shadow-sm"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/connectors/${event.source ?? "google_calendar"}.svg`}
            alt=""
            className="size-4 object-contain"
          />
        </span>
      )}
    </button>
  );
}

/** Én verden-sektion (Storgaard / Privat) med dag-grupperet agenda. */
function CalendarSection({
  workspace,
  events,
}: {
  workspace: Workspace;
  events: CalendarEventItem[];
}) {
  // Gruppér pr. dag (events er allerede sorteret efter starttid).
  const groups: { key: string; heading: string; items: CalendarEventItem[] }[] = [];
  for (const event of events) {
    const key = dayKey(event.startsAt);
    let group = groups.find((g) => g.key === key);
    if (!group) {
      group = { key, heading: formatDayHeading(event.startsAt), items: [] };
      groups.push(group);
    }
    group.items.push(event);
  }

  return (
    <motion.section
      layout
      transition={{ type: "spring", stiffness: 260, damping: 30 }}
      style={tint(workspace)}
      className="rounded-2xl border p-4 sm:p-5"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span aria-hidden className="text-xl">{META[workspace].emoji}</span>
          {META[workspace].label}
        </h2>
        <span className="rounded-full bg-background/60 px-2.5 py-1 text-xs">
          <span className="font-semibold">{events.length}</span>{" "}
          <span className="text-muted-foreground">kommende</span>
        </span>
      </div>

      {events.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/60 py-8 text-center text-sm text-muted-foreground">
          Ingen kommende aftaler her.
        </p>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <div key={group.key} className="overflow-hidden rounded-xl border border-border/50 bg-card/60">
              <div className="border-b border-border/50 bg-secondary/30 px-4 py-2">
                <h3 className="text-sm font-semibold capitalize">{group.heading}</h3>
              </div>
              <div className="divide-y divide-border/50 px-4">
                {group.items.map((event) => (
                  <EventRow key={event.id} event={event} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.section>
  );
}

/**
 * CalendarSections – opdeler kalenderen i 🚗 Storgaard Biler og 🏠 Privat
 * (præcis som Opgaver). Rækkefølgen følger arbejdstiden (man–fre 9–17, søn
 * 12–16 → arbejde øverst, ellers privat øverst) og gentjekkes hvert minut.
 */
export function CalendarSections({
  events,
  initialOrder,
}: {
  events: CalendarEventItem[];
  initialOrder: Workspace[];
}) {
  const [order, setOrder] = React.useState<Workspace[]>(initialOrder);

  // Gentjek rækkefølgen hvert minut (auto-prioritering efter klokkeslæt).
  React.useEffect(() => {
    const tick = () => setOrder(getWorkspaceOrder());
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  // Kun i dag og frem.
  const todayKey = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Copenhagen" });
  const upcoming = events
    .filter((e) => e.startsAt && dayKey(e.startsAt) >= todayKey)
    .sort((a, b) => (a.startsAt ?? "").localeCompare(b.startsAt ?? ""));

  if (upcoming.length === 0) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-soft">
        <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
          <span className="flex size-12 items-center justify-center rounded-xl bg-secondary text-primary">
            <CalendarIcon className="size-6" />
          </span>
          <p className="max-w-md text-sm text-muted-foreground">
            Ingen kommende aftaler. Forbind <strong>Google Kalender</strong> under
            Indstillinger → Integrationer, eller opret en begivenhed med knappen
            ovenfor.
          </p>
          <Link
            href="/indstillinger"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-secondary"
          >
            <Settings2 className="size-4" />
            Åbn Integrationer
          </Link>
        </div>
      </div>
    );
  }

  const byWorld: Record<Workspace, CalendarEventItem[]> = {
    work: upcoming.filter((e) => e.workspace === "work"),
    private: upcoming.filter((e) => e.workspace !== "work"),
  };

  return (
    <div className="space-y-4">
      {order.map((workspace) => (
        <CalendarSection key={workspace} workspace={workspace} events={byWorld[workspace]} />
      ))}
      <p className="px-1 text-xs text-muted-foreground">
        Rækkefølgen skifter automatisk efter arbejdstid. Calendar AI bruger
        aftalerne til at planlægge – den ændrer aldrig noget uden din godkendelse.
      </p>
    </div>
  );
}
