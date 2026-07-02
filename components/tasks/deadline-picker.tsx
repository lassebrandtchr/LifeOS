"use client";

import * as React from "react";
import * as Popover from "@radix-ui/react-popover";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * DeadlinePicker – erstatter den native <input type="datetime-local">, hvis
 * kalender-popup browseren selv tegner (uden for siden, kan ikke stylees) med
 * en egen kalender i appens "liquid glass"-stil, der selv følger med i
 * dark/light mode via CSS-variablerne fra globals.css.
 *
 * Værdi-format er uændret ("YYYY-MM-DDTHH:MM", lokal tid), så resten af
 * TaskEditor (isoToLocalInput/localInputToIso) ikke skal ændres.
 */

const WEEKDAYS = ["M", "T", "O", "T", "F", "L", "S"];
const MONTHS = [
  "Januar", "Februar", "Marts", "April", "Maj", "Juni",
  "Juli", "August", "September", "Oktober", "November", "December",
];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function parseLocalValue(value: string): { date: Date | null; hh: string; mm: string } {
  if (!value) return { date: null, hh: "12", mm: "00" };
  const [datePart, timePart] = value.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);
  const [hh, mm] = (timePart ?? "12:00").split(":");
  return { date, hh: hh ?? "12", mm: mm ?? "00" };
}

function toLocalValue(date: Date, hh: string, mm: string): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(Number(hh) || 0)}:${pad(Number(mm) || 0)}`;
}

function sameDay(a: Date | null, b: Date | null): boolean {
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function fmtDisplay(value: string): string {
  const { date, hh, mm } = parseLocalValue(value);
  if (!date) return "";
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}, ${hh}.${mm}`;
}

/** Lille timer/minut-felt der kun retter/afrunder værdien ved blur, så man kan nå at skrive 2 cifre. */
function TimeField({
  value,
  max,
  onCommit,
  ariaLabel,
}: {
  value: string;
  max: number;
  onCommit: (v: string) => void;
  ariaLabel: string;
}) {
  const [local, setLocal] = React.useState(value);
  // Deriveret state (ikke useEffect): synkroniser kun når værdien reelt er
  // ændret UDEFRA (fx et andet felt commiter) – vores egen onBlur sætter
  // allerede "local" til den samme paddede værdi, så det er no-op der.
  const [prevValue, setPrevValue] = React.useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setLocal(value);
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      maxLength={2}
      value={local}
      onChange={(e) => setLocal(e.target.value.replace(/\D/g, "").slice(0, 2))}
      onBlur={() => {
        const n = Math.min(max, Math.max(0, Number(local) || 0));
        const padded = pad(n);
        setLocal(padded);
        onCommit(padded);
      }}
      aria-label={ariaLabel}
      className="h-8 w-12 rounded-lg border border-input bg-background text-center text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    />
  );
}

export function DeadlinePicker({
  value,
  onChange,
  className,
  accentColor,
  placeholderText = "Vælg dato og tid",
  icon: Icon = CalendarIcon,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  /** CSS-farveværdi til valgt dag/"I dag"-knap – default appens primærgrønne (Deadline). Sæt en anden for fx "Påmind mig", så de kan skelnes visuelt. */
  accentColor?: string;
  placeholderText?: string;
  icon?: React.ElementType;
}) {
  const accent = accentColor ?? "var(--primary)";
  const [open, setOpen] = React.useState(false);
  const parsed = parseLocalValue(value);
  const [viewDate, setViewDate] = React.useState(() => parsed.date ?? new Date());

  // Genindlæs synlig måned, hver gang popoveren åbnes (kan være ændret
  // udefra siden sidst den var åben) – deriveret state, ikke en effekt.
  const [wasOpen, setWasOpen] = React.useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setViewDate(parsed.date ?? new Date());
  }

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7; // mandag = 0
  const daysCount = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysCount; d++) cells.push(new Date(year, month, d));

  function pickDay(d: Date) {
    onChange(toLocalValue(d, parsed.hh, parsed.mm));
  }

  function commitTime(hh: string, mm: string) {
    const base = parsed.date ?? viewDate;
    onChange(toLocalValue(base, hh, mm));
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-9 w-full items-center justify-between rounded-xl border border-input bg-card px-3.5 text-sm shadow-soft transition-colors",
            "hover:border-ring/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
            className,
          )}
        >
          <span className={value ? "text-foreground" : "text-muted-foreground"}>
            {value ? fmtDisplay(value) : placeholderText}
          </span>
          <Icon className="size-4 shrink-0 text-muted-foreground" style={value ? { color: accent } : undefined} />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={8}
          className="glass-card-strong z-[70] w-[300px] rounded-card p-4 text-foreground shadow-soft-lg outline-none"
        >
          {/* Måned-navigation */}
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold">
              {MONTHS[month]} {year}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setViewDate(new Date(year, month - 1, 1))}
                className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                aria-label="Forrige måned"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewDate(new Date(year, month + 1, 1))}
                className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                aria-label="Næste måned"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>

          {/* Ugedage */}
          <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted-foreground">
            {WEEKDAYS.map((w, i) => (
              <span key={i}>{w}</span>
            ))}
          </div>

          {/* Dage */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (!d) return <span key={i} />;
              const isSelected = sameDay(d, parsed.date);
              const isToday = sameDay(d, today);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => pickDay(d)}
                  className={cn(
                    "flex aspect-square items-center justify-center rounded-lg text-sm font-medium transition-colors",
                    !isSelected && !isToday && "text-foreground/85 hover:bg-secondary",
                  )}
                  style={
                    isSelected
                      ? { backgroundColor: accent, color: "white" }
                      : isToday
                        ? { color: accent, boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${accent} 50%, transparent)` }
                        : undefined
                  }
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>

          {/* Tid */}
          <div className="mt-3 flex items-center gap-2 border-t border-border/50 pt-3">
            <Clock className="size-3.5 shrink-0 text-muted-foreground" />
            <TimeField value={parsed.hh} max={23} onCommit={(hh) => commitTime(hh, parsed.mm)} ariaLabel="Time" />
            <span className="text-muted-foreground">:</span>
            <TimeField value={parsed.mm} max={59} onCommit={(mm) => commitTime(parsed.hh, mm)} ariaLabel="Minut" />
          </div>

          {/* Handlinger */}
          <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-3">
            <button
              type="button"
              onClick={() => onChange("")}
              className="text-xs font-medium text-muted-foreground transition-colors hover:text-destructive"
            >
              Ryd
            </button>
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                setViewDate(now);
                onChange(toLocalValue(now, pad(now.getHours()), pad(now.getMinutes())));
              }}
              style={{ color: accent }}
              className="text-xs font-medium hover:underline"
            >
              I dag
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
