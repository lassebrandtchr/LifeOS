"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarPlus, X, Sparkles, MapPin, Clock, Car, User } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MiniCalendar } from "@/components/calendar/mini-calendar";
import { parseEventInput } from "@/features/calendar/parse-event";
import { createCalendarEvent } from "@/features/calendar/actions";
import type { Workspace } from "@/features/tasks/constants";

const pad = (n: number) => String(n).padStart(2, "0");
const toYmd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toHM = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

const PRETTY_DATE = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("da-DK", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
};

/**
 * NewEventDialog – "Ny begivenhed"-knap + pop-op.
 * Skriv naturligt dansk i chat-feltet ("Spise hos Mike & Louise på næste fredag
 * kl 17.30"); appen forstår det og udfylder felterne + mini-kalenderen, som du
 * frit kan finjustere. Gemmes i LifeOS med det samme.
 */
export function NewEventDialog({
  initialTitle,
  initialWorkspace,
  autoOpen = false,
}: {
  initialTitle?: string;
  initialWorkspace?: Workspace;
  autoOpen?: boolean;
} = {}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const [chat, setChat] = React.useState("");
  const [title, setTitle] = React.useState(initialTitle ?? "");
  const [dateYmd, setDateYmd] = React.useState(() => toYmd(new Date()));
  const [startTime, setStartTime] = React.useState("12:00");
  const [endTime, setEndTime] = React.useState("13:00");
  const [location, setLocation] = React.useState("");
  const [workspace, setWorkspace] = React.useState<Workspace>(
    initialWorkspace ?? "private",
  );

  // Kom man hertil fra en genvej (fx "Aflevering af bil")? Åbn forudfyldt.
  const opened = React.useRef(false);
  React.useEffect(() => {
    if (autoOpen && !opened.current) {
      opened.current = true;
      setOpen(true);
    }
  }, [autoOpen]);

  const close = React.useCallback(() => {
    setOpen(false);
    setChat("");
    setTitle("");
    setDateYmd(toYmd(new Date()));
    setStartTime("12:00");
    setEndTime("13:00");
    setLocation("");
    setWorkspace("private");
  }, []);

  // Live-forståelse af chat-feltet → udfylder felterne.
  function onChat(v: string) {
    setChat(v);
    const p = parseEventInput(v);
    if (p.title) setTitle(p.title);
    if (p.start) {
      setDateYmd(toYmd(p.start));
      setStartTime(toHM(p.start));
      if (p.end) setEndTime(toHM(p.end));
    }
    if (p.location) setLocation(p.location);
    setWorkspace(p.workspace);
  }

  function onSubmit() {
    if (!title.trim()) {
      toast.error("Giv begivenheden en titel.");
      return;
    }
    const [y, m, d] = dateYmd.split("-").map(Number);
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const start = new Date(y, m - 1, d, sh, sm);
    let end = new Date(y, m - 1, d, eh, em);
    if (end <= start) end = new Date(start.getTime() + 60 * 60 * 1000);

    startTransition(async () => {
      const res = await createCalendarEvent({
        title: title.trim(),
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
        location,
        workspace,
      });
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success(
          res?.syncedToGoogle
            ? "Oprettet i LifeOS + Google Kalender ✓"
            : "Oprettet i LifeOS ✓ (forbind Google i Indstillinger for at synke)",
        );
        close();
        router.refresh();
      }
    });
  }

  // Luk på Escape.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <CalendarPlus className="size-4" />
        Ny begivenhed
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm sm:items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(e) => e.target === e.currentTarget && close()}
          >
            <motion.div
              className="my-8 w-full max-w-2xl rounded-card border border-border/70 bg-card shadow-soft-lg"
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-secondary text-primary">
                    <CalendarPlus className="size-5" />
                  </span>
                  <div>
                    <h2 className="text-lg font-semibold leading-tight">Ny begivenhed</h2>
                    <p className="text-xs text-muted-foreground">
                      Skriv det med dine egne ord – LifeOS forstår resten.
                    </p>
                  </div>
                </div>
                <button
                  onClick={close}
                  className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  aria-label="Luk"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Chat-felt */}
              <div className="px-6 pt-5">
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium">
                  <Sparkles className="size-4 text-primary" />
                  Beskriv begivenheden
                </label>
                <textarea
                  autoFocus
                  value={chat}
                  onChange={(e) => onChat(e.target.value)}
                  rows={2}
                  placeholder="fx: Spise hos Mike & Louise på næste fredag kl 17.30"
                  className="w-full resize-none rounded-xl border border-border/60 bg-background px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground/70 focus:border-ring focus:ring-2 focus:ring-ring/30"
                />
              </div>

              {/* Felter + mini-kalender */}
              <div className="grid gap-5 px-6 py-5 sm:grid-cols-[1fr_auto]">
                <div className="space-y-3.5">
                  <Field label="Titel">
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Begivenhedens titel" />
                  </Field>

                  <Field label="Valgt dato">
                    <div className="flex h-10 items-center rounded-xl border border-border/60 bg-secondary/30 px-3 text-sm capitalize">
                      {PRETTY_DATE(dateYmd)}
                    </div>
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Start">
                      <div className="flex items-center gap-2">
                        <Clock className="size-4 shrink-0 text-muted-foreground" />
                        <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                      </div>
                    </Field>
                    <Field label="Slut">
                      <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                    </Field>
                  </div>

                  <Field label="Sted (valgfrit)">
                    <div className="flex items-center gap-2">
                      <MapPin className="size-4 shrink-0 text-muted-foreground" />
                      <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="fx Mike & Louise" />
                    </div>
                  </Field>

                  <Field label="Verden">
                    <div className="grid grid-cols-2 gap-2">
                      <WorldButton active={workspace === "private"} onClick={() => setWorkspace("private")} icon={User} label="Privat" />
                      <WorldButton active={workspace === "work"} onClick={() => setWorkspace("work")} icon={Car} label="Storgaard" />
                    </div>
                  </Field>
                </div>

                <div className="sm:w-64">
                  <MiniCalendar value={dateYmd} onChange={setDateYmd} />
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between gap-3 border-t border-border/60 px-6 py-4">
                <p className="text-xs text-muted-foreground">
                  Gemmes i LifeOS med det samme.
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={close} disabled={pending}>
                    Annullér
                  </Button>
                  <Button onClick={onSubmit} disabled={pending} className="gap-2">
                    <CalendarPlus className="size-4" />
                    {pending ? "Opretter …" : "Opret begivenhed"}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function WorldButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-10 items-center justify-center gap-2 rounded-xl border text-sm font-medium transition-colors",
        active
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border/60 bg-secondary/30 text-muted-foreground hover:bg-secondary",
      )}
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}
