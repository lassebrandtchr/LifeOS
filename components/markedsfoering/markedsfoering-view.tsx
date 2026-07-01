"use client";

import { Megaphone, Plus, Palette, Globe, Share2, Camera, Calendar } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  PageQuickActions,
  type QuickAction,
} from "@/components/dashboard/page-quick-actions";
import { useOpenDetail } from "@/components/tasks/detail-context";
import { priorities, categoryById, statuses } from "@/features/tasks/constants";
import type { Task } from "@/features/tasks/types";

const ACCENT = "var(--brand)";

const marketingActions: QuickAction[] = [
  { kind: "navigate", label: "Ny opgave", icon: Plus, color: "#4f8dff", href: "/opgaver" },
  { kind: "create-task", label: "Designopgave", icon: Palette, color: "#a78bfa", title: "Designopgave", workspace: "work", category: "markedsfoering" },
  { kind: "create-task", label: "Hjemmesideopgave", icon: Globe, color: "#34b3a4", title: "Hjemmesideopgave", workspace: "work", category: "markedsfoering" },
  { kind: "create-task", label: "SoMe-opslag", icon: Share2, color: "#f472b6", title: "SoMe-opslag", workspace: "work", category: "sociale_medier" },
  { kind: "create-task", label: "Foto-/videoopgave", icon: Camera, color: "#e6b15a", title: "Foto-/videoopgave", workspace: "work", category: "markedsfoering" },
];

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("da-DK", { day: "numeric", month: "short" });
}

function TaskRow({ task }: { task: Task }) {
  const { open } = useOpenDetail();
  const cat = categoryById(task.category);
  const prio = priorities[task.priority];
  const deadline = formatDate(task.deadline);
  const done = task.status === "done";
  return (
    <button
      type="button"
      onClick={() => open({ type: "task", task })}
      className="flex w-full items-center gap-3 border-b border-border/50 px-1 py-3 text-left transition-colors last:border-0 hover:bg-secondary/30"
    >
      <span className={cn("size-2.5 shrink-0 rounded-full", prio.dot)} aria-hidden />
      <span className={cn("min-w-0 flex-1 truncate text-sm font-medium", done && "text-muted-foreground line-through")}>
        {task.title}
      </span>
      {cat && <Badge variant="secondary" className="shrink-0">{cat.emoji} {cat.label}</Badge>}
      {task.status !== "not_started" && (
        <Badge variant="outline" className="shrink-0">{statuses[task.status]?.label}</Badge>
      )}
      {deadline && (
        <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="size-3" /> {deadline}
        </span>
      )}
    </button>
  );
}

export function MarkedsfoeringView({ tasks }: { tasks: Task[] }) {
  const active = tasks.filter((t) => t.status !== "done" && t.status !== "archived");
  const done = tasks.filter((t) => t.status === "done");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="flex size-11 items-center justify-center rounded-xl"
          style={{ backgroundColor: `color-mix(in oklab, ${ACCENT} 16%, transparent)`, color: ACCENT }}
        >
          <Megaphone className="size-6" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Markedsføring</h1>
          <p className="text-sm text-muted-foreground">
            Opslag, kampagner og indhold for Storgaard Biler.
          </p>
        </div>
      </div>

      {/* Hurtige handlinger */}
      <PageQuickActions actions={marketingActions} />

      {/* Opgaveliste */}
      <Card className="px-4 py-2">
        <div className="flex items-center justify-between px-1 py-2">
          <h2 className="text-sm font-semibold">Aktive markedsføringsopgaver</h2>
          <span className="text-xs text-muted-foreground">
            {active.length} aktive{done.length > 0 ? ` · ${done.length} færdige` : ""}
          </span>
        </div>
        {active.length === 0 ? (
          <p className="px-1 py-8 text-center text-sm text-muted-foreground">
            Ingen markedsføringsopgaver endnu. Brug en hurtig handling ovenfor for
            at oprette den første.
          </p>
        ) : (
          active.map((t) => <TaskRow key={t.id} task={t} />)
        )}
      </Card>
    </div>
  );
}
