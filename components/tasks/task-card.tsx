"use client";

import { Check, Calendar, GripVertical, StickyNote } from "lucide-react";

import { cn } from "@/lib/utils";
import { priorities, categoryById, statuses } from "@/features/tasks/constants";
import { useOpenDetail } from "@/components/tasks/detail-context";
import type { Task } from "@/features/tasks/types";

/** Kort uddrag af en note (til visning under titlen). */
function noteExcerpt(notes: string | null): string | null {
  if (!notes) return null;
  const clean = notes.replace(/\s+/g, " ").trim();
  if (!clean) return null;
  return clean.length > 70 ? clean.slice(0, 69).trimEnd() + "…" : clean;
}

function formatDeadline(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("da-DK", { day: "numeric", month: "short" });
}

/**
 * TaskCard – ét opgavekort. Rent præsentationslag (ingen drag-logik her),
 * så det kan genbruges både i kolonnerne og i drag-overlayet.
 */
export function TaskCard({
  task,
  onComplete,
  dragging = false,
  className,
}: {
  task: Task;
  onComplete?: (id: string) => void;
  dragging?: boolean;
  className?: string;
}) {
  const prio = priorities[task.priority] ?? priorities.can_wait;
  const cat = categoryById(task.category);
  const deadline = formatDeadline(task.deadline);
  const excerpt = noteExcerpt(task.notes);
  const { open } = useOpenDetail();

  return (
    <div
      onClick={() => open({ type: "task", task })}
      className={cn(
        "group/card flex cursor-pointer items-start gap-3 rounded-xl border border-border/60 bg-card p-3 shadow-soft",
        "transition-[transform,box-shadow,border-color] duration-200 ease-out",
        "hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-soft-lg",
        dragging && "rotate-1 scale-[1.02] shadow-soft-lg",
        className,
      )}
    >
      {/* Fuldfør-knap */}
      <button
        type="button"
        aria-label="Markér som færdig"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onComplete?.(task.id);
        }}
        className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-border text-transparent transition-colors hover:border-success hover:text-success"
      >
        <Check className="size-3" />
      </button>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-snug">{task.title}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {cat && (
            <span className="inline-flex items-center gap-1">
              <span aria-hidden>{cat.emoji}</span>
              {cat.label}
            </span>
          )}
          {deadline && (
            <span className="inline-flex items-center gap-1">
              <Calendar className="size-3" />
              {deadline}
            </span>
          )}
          {task.status !== "not_started" && (
            <span className="inline-flex items-center gap-1">
              {statuses[task.status]?.label}
            </span>
          )}
        </div>
        {excerpt && (
          <p className="mt-1.5 flex items-center gap-1 truncate text-xs text-muted-foreground/80">
            <StickyNote className="size-3 shrink-0" />
            {excerpt}
          </p>
        )}
      </div>

      {/* Prioritet + greb */}
      <div className="flex shrink-0 items-center gap-2">
        <span
          aria-label={prio.label}
          title={prio.label}
          className={cn("size-2.5 rounded-full", prio.dot)}
        />
        <GripVertical className="size-4 text-muted-foreground/50 opacity-0 transition-opacity group-hover/card:opacity-100" />
      </div>
    </div>
  );
}
