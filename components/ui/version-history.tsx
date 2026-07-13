"use client";

import * as React from "react";
import { History, RotateCcw, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Fælles "Tidligere udgaver"-liste – bruges både af notesblokken og af
 * opgave-editoren, så de to steder ser ens ud og opfører sig ens.
 *
 * Selve kopierne laves af en database-trigger (migration 0015), så der ALTID
 * gemmes en udgave, når noget ændres – uanset hvor i appen ændringen skete.
 */

export type VersionEntry = {
  id: string;
  created_at: string;
  /** Kort tekst der vises i listen, så man kan genkende udgaven. */
  preview: string;
};

/** "for 5 min. siden" / "i dag 14.32" / "12.07 kl. 09.15" */
export function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const minutes = Math.round((Date.now() - d.getTime()) / 60_000);
  if (minutes < 1) return "lige nu";
  if (minutes < 60) return `for ${minutes} min. siden`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `for ${hours} ${hours === 1 ? "time" : "timer"} siden`;
  return d.toLocaleString("da-DK", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function VersionHistory({
  versions,
  loading,
  restoringId,
  onRestore,
  emptyText,
}: {
  versions: VersionEntry[];
  loading: boolean;
  restoringId: string | null;
  onRestore: (id: string) => void;
  emptyText: string;
}) {
  if (loading) {
    return (
      <p className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Henter tidligere udgaver …
      </p>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="py-8 text-center">
        <History className="mx-auto size-6 text-muted-foreground/60" />
        <p className="mt-2 text-sm text-muted-foreground">{emptyText}</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {versions.map((v) => (
        <li
          key={v.id}
          className="flex items-start gap-3 rounded-xl border border-border/60 bg-secondary/20 px-3 py-2.5"
        >
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground">
              {formatWhen(v.created_at)}
            </p>
            <p className="mt-0.5 line-clamp-2 whitespace-pre-wrap break-words text-sm">
              {v.preview || <span className="italic text-muted-foreground">(tom)</span>}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => onRestore(v.id)}
            disabled={restoringId !== null}
            className="shrink-0"
          >
            {restoringId === v.id ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RotateCcw className="size-4" />
            )}
            Gendan
          </Button>
        </li>
      ))}
    </ul>
  );
}
