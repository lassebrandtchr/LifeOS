"use client";

import * as React from "react";
import { Bell, X, Clock } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { getDueReminders, updateTask } from "@/features/tasks/actions";
import { useOpenDetail } from "@/components/tasks/detail-context";
import type { Task } from "@/features/tasks/types";
import { stripHtmlInline } from "@/lib/text/strip-html";

const POLL_MS = 30_000;

function fmtReminder(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("da-DK", { day: "2-digit", month: "2-digit", year: "numeric" });
  const time = d.toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" });
  return `${date} kl. ${time}`;
}

/**
 * ReminderWatcher – poller hvert 30. sekund for opgaver hvor "Påmind mig"-
 * tiden er nået, og viser en tydelig, glødende, let "vibrerende" pop op i
 * højre side af appen (uanset hvilken side man er på) – lige præcis som
 * efterspurgt. Glødfarven følger det valgte farvetema (var(--primary) via
 * .reminder-toast i globals.css), så den fx er blå i navy-temaet og rød i
 * bordeaux-temaet. Forsvinder først når man klikker den (åbner opgaven)
 * eller lukker den eksplicit – begge dele rydder samtidig reminder_at
 * server-side, så den aldrig dukker op igen af sig selv.
 *
 * Bevidst uden localStorage-tracking: at rydde reminder_at i databasen ved
 * lukning er den enkle, robuste kilde til sandhed (virker på tværs af
 * faneblade/enheder), i stedet for at holde en separat "set" af set-id'er.
 */
export function ReminderWatcher() {
  const [active, setActive] = React.useState<Task[]>([]);
  const { open } = useOpenDetail();

  React.useEffect(() => {
    let cancelled = false;

    async function poll() {
      // Try/catch: på mobil fejler et netværkskald jævnligt (dårlig dækning,
      // skærmen har været slukket, appen har ligget i baggrunden). Uden dette
      // ville et enkelt fejlet kald give en ubehandlet fejl og stoppe
      // påmindelserne resten af sessionen. Nu springes runden bare over, og
      // næste poll (30 s senere) prøver igen.
      try {
        const due = await getDueReminders();
        if (cancelled) return;
        if (!Array.isArray(due)) return; // defensiv: aldrig .filter på ikke-array
        setActive((prev) => {
          const prevIds = new Set(prev.map((t) => t.id));
          const fresh = due.filter((t) => !prevIds.has(t.id));
          return fresh.length > 0 ? [...prev, ...fresh] : prev;
        });
      } catch {
        // Stille fejl – påmindelser er ikke kritiske nok til at genere med en
        // fejlbesked hvert 30. sekund. Næste runde forsøger igen.
      }
    }

    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  function dismiss(task: Task) {
    setActive((prev) => prev.filter((t) => t.id !== task.id));
    // .catch(): fejler kaldet (dårlig dækning), skal påmindelsen stadig
    // forsvinde fra skærmen – den dukker så op igen ved næste poll, hvilket
    // er den rigtige opførsel (reminder_at blev jo ikke ryddet).
    void updateTask(task.id, { reminder_at: null }).catch(() => {});
  }

  function openTask(task: Task) {
    open({ type: "task", task });
    dismiss(task);
  }

  return (
    <div className="pointer-events-none fixed right-4 top-20 z-[100] flex flex-col gap-3 sm:right-6">
      <AnimatePresence>
        {active.map((task) => (
          <motion.div
            key={task.id}
            layout
            initial={{ opacity: 0, x: 60, scale: 0.92 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            transition={{ type: "spring", stiffness: 340, damping: 26 }}
            className="reminder-toast pointer-events-auto w-[300px] rounded-2xl border p-4"
            style={{
              backgroundImage:
                "linear-gradient(135deg, color-mix(in oklab, var(--primary) 16%, var(--card)) 0%, var(--card) 70%)",
            }}
          >
            <div className="flex items-start gap-3">
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-full"
                style={{
                  backgroundColor: "color-mix(in oklab, var(--primary) 15%, transparent)",
                  color: "var(--primary)",
                }}
              >
                <Bell className="size-4.5" />
              </span>
              <button
                type="button"
                onClick={() => openTask(task)}
                className="min-w-0 flex-1 text-left"
              >
                <p
                  className="text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "var(--primary)" }}
                >
                  Påmindelse
                </p>
                <p className="mt-0.5 text-sm font-semibold leading-snug text-foreground">
                  {stripHtmlInline(task.title)}
                </p>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="size-3" />
                  {task.reminder_at && fmtReminder(task.reminder_at)}
                </p>
              </button>
              <button
                type="button"
                onClick={() => dismiss(task)}
                aria-label="Luk påmindelse"
                className="flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
