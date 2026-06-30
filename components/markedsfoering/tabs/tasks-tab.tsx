"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, CheckSquare, Calendar } from "lucide-react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/markedsfoering/ui";
import { DetailProvider, useOpenDetail } from "@/components/tasks/detail-context";
import { priorities, priorityOrder, statuses, categoryById, type Priority } from "@/features/tasks/constants";
import { quickCreateTask } from "@/features/tasks/actions";
import { parseTaskInput } from "@/features/tasks/parse";
import type { Task } from "@/features/tasks/types";

export function TasksTab({ tasks, autoCreate = false }: { tasks: Task[]; autoCreate?: boolean }) {
  return (
    <DetailProvider>
      <TasksInner tasks={tasks} autoCreate={autoCreate} />
    </DetailProvider>
  );
}

function TasksInner({ tasks, autoCreate }: { tasks: Task[]; autoCreate: boolean }) {
  const router = useRouter();
  const [title, setTitle] = React.useState("");
  const [pending, setPending] = React.useState(false);

  function add() {
    if (!title.trim()) return;
    setPending(true);
    const parsed = parseTaskInput(title);
    quickCreateTask({
      title: parsed.title || title,
      workspace: "work",
      category: parsed.categoryId ?? "markedsfoering",
      priority: parsed.priority ?? "can_wait",
    }).then((res) => {
      setPending(false);
      if (res?.error) toast.error(res.error);
      else { setTitle(""); toast.success("Marketingopgave tilføjet ✓"); router.refresh(); }
    });
  }

  const active = tasks.filter((t) => t.status !== "done" && t.status !== "archived");
  const doneCount = tasks.filter((t) => t.status === "done").length;

  // Grupper aktive opgaver efter prioritet.
  const byPriority = priorityOrder
    .map((p) => ({ p, items: active.filter((t) => t.priority === p) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="space-y-4">
      <Card className="flex items-center gap-2 p-2">
        <Input
          autoFocus={autoCreate}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Ny marketingopgave – fx “Film ny Audi i morgen”"
          className="h-10 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0"
        />
        <Button onClick={add} disabled={pending} className="gap-1.5"><Plus className="size-4" /> Tilføj</Button>
      </Card>

      {active.length === 0 ? (
        <EmptyState icon={CheckSquare} text="Ingen aktive marketingopgaver. Tilføj en ovenfor – fx “Tag billeder af ny bil”." />
      ) : (
        <div className="space-y-5">
          {byPriority.map((g) => (
            <section key={g.p}>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <span className={cn("size-2 rounded-full", priorities[g.p].dot)} />
                {priorities[g.p].label}
                <span className="text-xs font-normal">({g.items.length})</span>
              </h3>
              <Card className="divide-y divide-border/50 px-4 py-1">
                {g.items.map((t) => <TaskRow key={t.id} task={t} />)}
              </Card>
            </section>
          ))}
        </div>
      )}

      {doneCount > 0 && (
        <p className="px-1 text-xs text-muted-foreground">✅ {doneCount} marketingopgave{doneCount === 1 ? "" : "r"} færdige</p>
      )}
    </div>
  );
}

function TaskRow({ task }: { task: Task }) {
  const { open } = useOpenDetail();
  const cat = categoryById(task.category);
  const prio = priorities[task.priority as Priority];
  const deadline = task.deadline
    ? new Date(task.deadline).toLocaleDateString("da-DK", { day: "numeric", month: "short" })
    : null;
  return (
    <button
      type="button"
      onClick={() => open({ type: "task", task })}
      className="flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-secondary/30"
    >
      <span className={cn("size-2.5 shrink-0 rounded-full", prio.dot)} aria-hidden />
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{task.title}</span>
      {cat && <Badge variant="secondary" className="shrink-0">{cat.emoji} {cat.label}</Badge>}
      {task.status !== "not_started" && <Badge variant="outline" className="shrink-0">{statuses[task.status]?.label}</Badge>}
      {deadline && <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground"><Calendar className="size-3" /> {deadline}</span>}
    </button>
  );
}
