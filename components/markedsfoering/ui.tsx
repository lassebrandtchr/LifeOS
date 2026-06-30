"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Delte byggeklodser for Marketing Workspace, så fanerne ikke gentager
 * modal-/felt-boilerplate. Samme udtryk som resten af LifeOS (rounded-card,
 * bløde fjeder-animationer, kompakt boks der altid er fuldt synlig).
 */

export function MarketingModal({
  open,
  title,
  icon,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  icon?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-card border border-border/70 bg-card shadow-soft-lg"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/60 px-5 py-3">
              <div className="flex items-center gap-2.5">
                {icon && (
                  <span className="flex size-8 items-center justify-center rounded-lg bg-secondary text-primary">
                    {icon}
                  </span>
                )}
                <h2 className="text-base font-semibold leading-tight">{title}</h2>
              </div>
              <button
                onClick={onClose}
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                aria-label="Luk"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">{children}</div>
            {footer && (
              <div className="flex shrink-0 justify-end gap-2 border-t border-border/60 px-5 py-3">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export const fieldInput =
  "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40";
export const fieldArea =
  "w-full resize-y rounded-xl border border-border/60 bg-background px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground/70 focus:border-ring focus:ring-2 focus:ring-ring/30";

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

/** Lille tom-tilstand til faner uden indhold endnu. */
export function EmptyState({
  icon: Icon,
  text,
}: {
  icon: React.ElementType;
  text: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/60 px-6 py-14 text-center">
      <Icon className="size-7 text-muted-foreground" />
      <p className="max-w-sm text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

/** Knap-grid til at vælge én værdi (fx kampagne-status, event-type). */
export function ChoiceGrid<T extends string>({
  options,
  value,
  onChange,
  columns = 3,
}: {
  options: { id: T; label: string; emoji?: string }[];
  value: T;
  onChange: (v: T) => void;
  columns?: number;
}) {
  return (
    <div className={cn("grid gap-2", columns === 2 ? "grid-cols-2" : "grid-cols-3")}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={cn(
            "flex h-10 items-center justify-center gap-1.5 rounded-xl border text-sm font-medium transition-colors",
            value === o.id
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border/60 bg-secondary/30 text-muted-foreground hover:bg-secondary",
          )}
        >
          {o.emoji && <span aria-hidden>{o.emoji}</span>}
          <span className="truncate">{o.label}</span>
        </button>
      ))}
    </div>
  );
}
