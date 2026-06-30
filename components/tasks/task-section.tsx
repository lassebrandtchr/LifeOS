"use client";

import { motion } from "framer-motion";

import { cn } from "@/lib/utils";
import { TaskBoard } from "@/components/tasks/task-board";
import type { Workspace } from "@/features/tasks/constants";
import type { TasksByBucket, Project } from "@/features/tasks/types";

const meta: Record<Workspace, { emoji: string; label: string }> = {
  work: { emoji: "🚗", label: "Storgaard Biler" },
  private: { emoji: "🏠", label: "Privat" },
};

/** Diskret, tema-tilpasset baggrundstone pr. verden. */
function tint(workspace: Workspace) {
  const accent = workspace === "work" ? "var(--brand)" : "var(--accent-private)";
  return {
    backgroundColor: `color-mix(in oklab, ${accent} 6%, var(--card))`,
    borderColor: `color-mix(in oklab, ${accent} 22%, var(--border))`,
  };
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-background/60 px-2.5 py-1 text-xs">
      <span className={cn("font-semibold", tone)}>{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

/**
 * TaskSection – én verden (Storgaard Biler eller Privat) med egen overskrift,
 * baggrundsfarve, statistik, opgaver (board) og projekter. Animeres med
 * Framer Motion `layout`, så sektionerne glider blødt på plads, når
 * rækkefølgen skifter (auto-prioritering efter arbejdstid).
 */
export function TaskSection({
  workspace,
  buckets,
  doneCount,
  projects,
}: {
  workspace: Workspace;
  buckets: TasksByBucket;
  doneCount: number;
  projects: Project[];
}) {
  const all = [...buckets.today, ...buckets.week, ...buckets.later];
  const inProgress = all.filter((t) => t.status === "in_progress").length;
  const urgent = all.filter((t) => t.priority === "urgent").length;
  const todayCount = buckets.today.length;

  return (
    <motion.section
      layout
      transition={{ type: "spring", stiffness: 260, damping: 30 }}
      style={tint(workspace)}
      className="rounded-2xl border p-4 sm:p-5"
    >
      {/* Overskrift + statistik */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span aria-hidden className="text-xl">{meta[workspace].emoji}</span>
          {meta[workspace].label}
        </h2>
        <div className="flex flex-wrap items-center gap-1.5">
          <Stat label="opgaver" value={all.length} />
          <Stat label="i gang" value={inProgress} tone="text-primary" />
          <Stat label="haster" value={urgent} tone="text-destructive" />
          <Stat label="færdige" value={doneCount} tone="text-success" />
          <Stat label="dagens fokus" value={todayCount} />
        </div>
      </div>

      {/* Projekter i denne verden */}
      {projects.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {projects.map((p) => (
            <span
              key={p.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/50 px-3 py-1 text-xs font-medium"
            >
              <span className="size-1.5 rounded-full bg-primary" />
              {p.name}
            </span>
          ))}
        </div>
      )}

      {/* Opgave-board (I dag / Denne uge / Senere) */}
      <TaskBoard initial={buckets} />
    </motion.section>
  );
}
