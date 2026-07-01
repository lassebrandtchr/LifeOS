"use client";

import { useState } from "react";
import { Check, Calendar, ListChecks } from "lucide-react";

import { cn } from "@/lib/utils";
import { SectionCard } from "@/components/dashboard/section-card";
import { setTaskStatus } from "@/features/tasks/actions";
import { priorities, categoryById, buckets, bucketOrder } from "@/features/tasks/constants";
import type { Workspace } from "@/features/tasks/constants";
import type { Task } from "@/features/tasks/types";

const MAX_VISIBLE = 8;

function formatDeadline(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("da-DK", { day: "numeric", month: "short" });
}

/**
 * WorkspaceTasks – præcis opgaveliste for én verden (arbejde/privat), grupperet
 * pr. bucket (I dag / Denne uge / Senere). Vises under "Hurtige handlinger" på
 * Storgaard Biler- og Privat-siderne, så man kan se nøjagtig hvilke opgaver
 * der ligger i den verden – uden at blande arbejde og privatliv sammen.
 */
export function WorkspaceTasks({
  tasks,
  workspace,
}: {
  tasks: Task[];
  workspace: Workspace;
}) {
  const [removedIds, setRemovedIds] = useState<ReadonlySet<string>>(new Set());
  const items = tasks.filter((t) => !removedIds.has(t.id));

  function handleComplete(id: string) {
    setRemovedIds((prev) => new Set(prev).add(id));
    void setTaskStatus(id, "done");
  }

  const title = workspace === "work" ? "Arbejdsopgaver" : "Private opgaver";

  // Flad, bucket-ordnet liste, begrænset til MAX_VISIBLE – men grupperet ved rendering.
  const visible = bucketOrder
    .flatMap((bucket) => items.filter((t) => t.bucket === bucket))
    .slice(0, MAX_VISIBLE);
  const hiddenCount = items.length - visible.length;

  return (
    <SectionCard title={title} icon={ListChecks} href="/opgaver">
      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {workspace === "work"
            ? "Ingen aktive arbejdsopgaver – godt gået!"
            : "Ingen aktive private opgaver."}
        </p>
      ) : (
        <div className="space-y-4">
          {bucketOrder.map((bucket) => {
            const list = visible.filter((t) => t.bucket === bucket);
            if (list.length === 0) return null;
            return (
              <div key={bucket}>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {buckets[bucket].label} · {items.filter((t) => t.bucket === bucket).length}
                </p>
                <ul className="space-y-0.5">
                  {list.map((task) => (
                    <TaskRow key={task.id} task={task} onComplete={handleComplete} />
                  ))}
                </ul>
              </div>
            );
          })}

          {hiddenCount > 0 && (
            <p className="text-xs text-muted-foreground">
              +{hiddenCount} flere opgave{hiddenCount !== 1 ? "r" : ""} – se alle under Opgaver →
            </p>
          )}
        </div>
      )}
    </SectionCard>
  );
}

function TaskRow({
  task,
  onComplete,
}: {
  task: Task;
  onComplete: (id: string) => void;
}) {
  const prio = priorities[task.priority] ?? priorities.can_wait;
  const cat = categoryById(task.category);
  const deadline = formatDeadline(task.deadline);

  return (
    <li className="-mx-1.5 flex items-start gap-2.5 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-secondary/50">
      <button
        type="button"
        aria-label="Markér som færdig"
        onClick={() => onComplete(task.id)}
        className="mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full border-2 border-border text-transparent transition-colors hover:border-success hover:text-success"
      >
        <Check className="size-2.5" />
      </button>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-snug">{task.title}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-muted-foreground">
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
        </div>
      </div>

      <span
        aria-label={prio.label}
        title={prio.label}
        className={cn("mt-1 size-2 shrink-0 rounded-full", prio.dot)}
      />
    </li>
  );
}
