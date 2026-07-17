"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Receipt, X, Check, ArrowRight, Loader2 } from "lucide-react";

import { safeGetItem, safeSetItem } from "@/lib/safe-storage";
import {
  getUnpaidInvoices,
  setInvoicePaid,
  type InvoiceItem,
} from "@/features/mail/invoice-actions";

/**
 * InvoiceReminder – minder om UBETALTE fakturaer 2-3 gange om dagen.
 *
 * Tre faste tidsvinduer (morgen/middag/eftermiddag). I hvert vindue vises
 * påmindelsen HØJST én gang pr. dag (styret via localStorage), så det bliver
 * 2-3 diskrete påmindelser dagligt – ikke spam. Er alt betalt, vises intet.
 *
 * Forfaldsdato udledes af mailteksten eller PDF'en (kan rettes manuelt inde i
 * mailen). Fakturaer med overskredet/nær forfald vises øverst.
 */

// Tidsvinduer på dagen (time-interval, 24t). Én påmindelse pr. vindue pr. dag.
const WINDOWS: { id: string; from: number; to: number }[] = [
  { id: "morgen", from: 7, to: 11 },
  { id: "middag", from: 11, to: 15 },
  { id: "eftermiddag", from: 15, to: 20 },
];

const POLL_MS = 5 * 60 * 1000; // tjek hvert 5. minut, om et vindue er åbnet

function todayKey(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Copenhagen" });
}
function currentWindow(): string | null {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: "Europe/Copenhagen" }).format(
      new Date(),
    ),
  );
  return WINDOWS.find((w) => hour >= w.from && hour < w.to)?.id ?? null;
}
function seenStorageKey(win: string): string {
  return `lifeos-invoice-reminder-${todayKey()}-${win}`;
}

function fmtDue(iso: string | null): { text: string; overdue: boolean; soon: boolean } {
  if (!iso) return { text: "ukendt forfald", overdue: false, soon: false };
  const due = new Date(`${iso}T00:00:00`);
  const today = new Date(todayKey() + "T00:00:00");
  const days = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  const nice = due.toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" });
  if (days < 0) return { text: `forfaldt d. ${nice}`, overdue: true, soon: false };
  if (days === 0) return { text: "forfalder I DAG", overdue: true, soon: true };
  if (days <= 3) return { text: `forfalder om ${days} ${days === 1 ? "dag" : "dage"} (${nice})`, overdue: false, soon: true };
  return { text: `forfald d. ${nice}`, overdue: false, soon: false };
}

/** Overskredet/nær forfald først, derefter ukendt forfald. */
function sortInvoices(items: InvoiceItem[]): InvoiceItem[] {
  return [...items].sort((a, b) => {
    const da = a.dueDate ?? "9999-99-99";
    const db = b.dueDate ?? "9999-99-99";
    return da.localeCompare(db);
  });
}

export function InvoiceReminder() {
  const router = useRouter();
  const [invoices, setInvoices] = React.useState<InvoiceItem[]>([]);
  const [visible, setVisible] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function check() {
      const win = currentWindow();
      if (!win) return; // uden for tidsvinduerne
      if (safeGetItem(seenStorageKey(win))) return; // allerede vist i dette vindue i dag
      try {
        const unpaid = await getUnpaidInvoices();
        if (cancelled || unpaid.length === 0) return;
        setInvoices(sortInvoices(unpaid));
        setVisible(true);
        safeSetItem(seenStorageKey(win), "1"); // markér vist for dette vindue/dag
      } catch {
        /* stille – prøver igen ved næste poll */
      }
    }

    check();
    const id = setInterval(check, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  async function markPaid(inv: InvoiceItem) {
    setBusyId(inv.id);
    const res = await setInvoicePaid(inv.id, true).catch(() => ({ error: "fejl" }));
    setBusyId(null);
    if ((res as { error?: string })?.error) return;
    setInvoices((prev) => {
      const next = prev.filter((i) => i.id !== inv.id);
      if (next.length === 0) setVisible(false);
      return next;
    });
    router.refresh();
  }

  function openInvoice(inv: InvoiceItem) {
    setVisible(false);
    router.push(`/mail?abn=${inv.id}`);
  }

  return (
    <div className="pointer-events-none fixed right-4 top-20 z-[95] flex w-[340px] max-w-[calc(100vw-2rem)] flex-col gap-3 sm:right-6">
      <AnimatePresence>
        {visible && invoices.length > 0 && (
          <motion.div
            layout
            initial={{ opacity: 0, x: 60, scale: 0.92 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            transition={{ type: "spring", stiffness: 340, damping: 26 }}
            className="pointer-events-auto rounded-2xl border border-warning/50 bg-card p-4 shadow-soft-lg"
            style={{
              backgroundImage:
                "linear-gradient(135deg, color-mix(in oklab, var(--warning) 14%, var(--card)) 0%, var(--card) 70%)",
            }}
          >
            <div className="mb-2 flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-warning/15 text-warning">
                <Receipt className="size-4.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-warning">
                  Ubetalt{invoices.length > 1 ? "e" : ""} faktura{invoices.length > 1 ? "er" : ""}
                </p>
                <p className="text-sm font-semibold leading-snug text-foreground">
                  {invoices.length} faktura{invoices.length > 1 ? "er" : ""} venter på betaling
                </p>
              </div>
              <button
                type="button"
                onClick={() => setVisible(false)}
                aria-label="Luk påmindelse"
                className="flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </div>

            <ul className="space-y-2">
              {invoices.slice(0, 4).map((inv) => {
                const due = fmtDue(inv.dueDate);
                return (
                  <li
                    key={inv.id}
                    className="rounded-xl border border-border/60 bg-background/50 px-3 py-2"
                  >
                    <button
                      type="button"
                      onClick={() => openInvoice(inv)}
                      className="block w-full text-left"
                    >
                      <p className="truncate text-sm font-medium">{inv.subject}</p>
                      <p
                        className={
                          due.overdue
                            ? "text-xs font-semibold text-destructive"
                            : due.soon
                              ? "text-xs font-medium text-warning"
                              : "text-xs text-muted-foreground"
                        }
                      >
                        {due.text}
                      </p>
                    </button>
                    <div className="mt-1.5 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => markPaid(inv)}
                        disabled={busyId === inv.id}
                        className="inline-flex items-center gap-1 rounded-lg border border-success/40 px-2 py-1 text-[11px] font-medium text-success transition-colors hover:bg-success/10 disabled:opacity-60"
                      >
                        {busyId === inv.id ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <Check className="size-3" />
                        )}
                        Markér betalt
                      </button>
                      <button
                        type="button"
                        onClick={() => openInvoice(inv)}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      >
                        Åbn <ArrowRight className="size-3" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            {invoices.length > 4 && (
              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                +{invoices.length - 4} flere
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
