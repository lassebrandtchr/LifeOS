"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Calendar as CalendarIcon, Clock, MapPin, X, AlignLeft } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatTime, formatDayHeading } from "@/lib/date";
import type { CalendarEventItem } from "@/features/integrations/types";

/**
 * CalendarEventDetail – åbner én kalenderbegivenhed i fuldt format, så noter/
 * beskrivelse skrevet under begivenheden er tydelige at læse (som i Google
 * Kalender selv).
 *
 * Beskrivelsen fra Google kan være ren tekst ELLER HTML. Vi konverterer altid
 * til ren, læsbar tekst (bevarer linjeskift, gør links klikbare) – aldrig rå
 * HTML, så mail-/kalender-indhold aldrig kan køre kode i appen.
 */

/** HTML/tekst-beskrivelse → linjer af ren tekst (linjeskift bevaret). */
function descriptionToLines(raw: string): string[] {
  let text = raw;
  if (/<[a-z][\s\S]*>/i.test(raw)) {
    // HTML: gør blok-tags til linjeskift, fjern resten, afkod entiteter.
    text = raw
      .replace(/<\s*br\s*\/?\s*>/gi, "\n")
      .replace(/<\/\s*(p|div|li|tr|h[1-6])\s*>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'");
  }
  return text.replace(/\r/g, "").split("\n");
}

const URL_RE = /(https?:\/\/[^\s]+)/g;

/** Én linje med klikbare links. */
function Line({ text }: { text: string }) {
  if (!text.trim()) return <span className="block h-3" />;
  const parts = text.split(URL_RE);
  return (
    <span className="block">
      {parts.map((part, i) =>
        URL_RE.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-primary underline underline-offset-2 [overflow-wrap:anywhere]"
          >
            {part}
          </a>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        ),
      )}
    </span>
  );
}

export function CalendarEventDetail({
  event,
  onClose,
}: {
  event: CalendarEventItem;
  onClose: () => void;
}) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const isWork = event.workspace === "work";
  const lines = event.description ? descriptionToLines(event.description) : [];

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-card border border-border/70 bg-card shadow-soft-lg"
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
        >
          {/* Header med farvet accent efter verden */}
          <div className="flex items-start gap-3 border-b border-border/60 px-5 py-4">
            <span
              aria-hidden
              className={cn(
                "mt-0.5 w-1.5 shrink-0 self-stretch rounded-full",
                isWork ? "bg-primary" : "bg-fuchsia-400/70",
              )}
            />
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold leading-snug">{event.title}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {isWork ? "🚗 Storgaard Biler" : "🏠 Privat"}
              </p>
            </div>
            <button
              type="button"
              aria-label="Luk"
              onClick={onClose}
              className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            {/* Tidspunkt */}
            <div className="flex items-start gap-3">
              <CalendarIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="text-sm">
                <p className="font-medium capitalize">{formatDayHeading(event.startsAt)}</p>
                <p className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="size-3.5" />
                  {event.allDay
                    ? "Hele dagen"
                    : `${formatTime(event.startsAt)}–${formatTime(event.endsAt)}`}
                </p>
              </div>
            </div>

            {/* Sted */}
            {event.location && (
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <p className="text-sm [overflow-wrap:anywhere]">{event.location}</p>
              </div>
            )}

            {/* Beskrivelse / noter – hovedformålet med denne visning */}
            {lines.length > 0 ? (
              <div className="flex items-start gap-3">
                <AlignLeft className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1 rounded-xl border border-border/60 bg-secondary/20 px-3.5 py-3 text-sm leading-relaxed">
                  {lines.map((line, i) => (
                    <Line key={i} text={line} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <AlignLeft className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <p className="text-sm italic text-muted-foreground">
                  Ingen noter på denne begivenhed.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
