"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * MiniCalendar – en lille, pæn månedskalender til at vælge en dato.
 * Mandag-først (dansk), markerer i dag og den valgte dag. Ingen afhængigheder.
 */

const MONTHS = [
  "januar", "februar", "marts", "april", "maj", "juni",
  "juli", "august", "september", "oktober", "november", "december",
];
const WEEKDAYS = ["ma", "ti", "on", "to", "fr", "lø", "sø"];

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function MiniCalendar({
  value,
  onChange,
}: {
  /** Valgt dato som YYYY-MM-DD. */
  value: string;
  onChange: (ymd: string) => void;
}) {
  const selected = React.useMemo(() => {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  }, [value]);

  const [view, setView] = React.useState(
    () => new Date(selected.getFullYear(), selected.getMonth(), 1),
  );

  // Hop til den valgte måned, når datoen ændres udefra (fx via chat-feltet).
  // Justering under render – Reacts anbefalede mønster frem for en effekt.
  const [prevValue, setPrevValue] = React.useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setView(new Date(selected.getFullYear(), selected.getMonth(), 1));
  }

  const todayYmd = ymd(new Date());
  const year = view.getFullYear();
  const month = view.getMonth();

  // Byg net: start på mandag.
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7; // 0=man
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="rounded-xl border border-border/60 bg-secondary/20 p-3">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setView(new Date(year, month - 1, 1))}
          className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label="Forrige måned"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-sm font-medium capitalize">
          {MONTHS[month]} {year}
        </span>
        <button
          type="button"
          onClick={() => setView(new Date(year, month + 1, 1))}
          className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label="Næste måned"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="py-1 text-center text-[11px] font-medium uppercase text-muted-foreground"
          >
            {w}
          </div>
        ))}
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const key = ymd(d);
          const isSelected = key === value;
          const isToday = key === todayYmd;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onChange(key)}
              className={cn(
                "flex h-8 items-center justify-center rounded-lg text-sm transition-colors",
                isSelected
                  ? "bg-primary font-semibold text-primary-foreground"
                  : "hover:bg-secondary",
                !isSelected && isToday && "font-semibold text-primary ring-1 ring-primary/40",
              )}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
