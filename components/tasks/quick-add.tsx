"use client";

import * as React from "react";
import { useActionState } from "react";
import { Plus, CalendarClock, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  categories,
  categoryById,
  priorityOrder,
  priorities,
  bucketOrder,
  buckets,
  workspaces,
} from "@/features/tasks/constants";
import { parseTaskInput } from "@/features/tasks/parse";
import { createTask } from "@/features/tasks/actions";
import { useOpenDetail } from "@/components/tasks/detail-context";
import type { Task } from "@/features/tasks/types";

const selectClass =
  "h-9 rounded-lg border border-input bg-card px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

function formatWhen(d: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  const diff = Math.round((day.getTime() - today.getTime()) / 86_400_000);
  const time = d.toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" });
  let label: string;
  if (diff === 0) label = "I dag";
  else if (diff === 1) label = "I morgen";
  else label = d.toLocaleDateString("da-DK", { weekday: "short", day: "numeric", month: "short" });
  return `${label} kl. ${time}`;
}

/**
 * QuickAdd – lynhurtig, "smart" oprettelse af en opgave.
 * Skriv naturligt ("Følg op på kunde i morgen kl 10"); systemet udleder dato,
 * kategori, verden og prioritet og viser en live forhåndsvisning nedenunder.
 * Selectorne står på "Auto" og kan bruges til at overstyre.
 */
export function QuickAdd() {
  const [state, action, pending] = useActionState(createTask, undefined);
  const [title, setTitle] = React.useState("");
  const formRef = React.useRef<HTMLFormElement>(null);
  const { open } = useOpenDetail();
  const handled = React.useRef<Task | null>(null);

  React.useEffect(() => {
    if (state?.error) toast.error(state.error);
    if (state?.ok && state.task && handled.current !== state.task) {
      handled.current = state.task;
      toast.success("Opgave tilføjet – åbner editoren …");
      formRef.current?.reset();
      setTitle("");
      // Åbn den nye opgave med det samme, så den kan redigeres.
      open({ type: "task", task: state.task });
    }
  }, [state, open]);

  const parsed = title.trim().length > 1 ? parseTaskInput(title) : null;
  const parsedCat = categoryById(parsed?.categoryId);
  const showPreview =
    parsed &&
    (parsed.deadline || parsed.categoryId || parsed.workspace || parsed.priority);

  return (
    <form
      ref={formRef}
      action={action}
      className="rounded-2xl border border-border/60 bg-card p-3 shadow-soft"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Skriv fx “Følg op på kunde i morgen kl 10” …"
          required
          autoComplete="off"
          className="h-10 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0"
        />
        <Button type="submit" disabled={pending} className="gap-1.5 sm:w-auto">
          <Plus className="size-4" />
          {pending ? "Tilføjer …" : "Tilføj"}
        </Button>
      </div>

      {/* Live forhåndsvisning af hvad systemet forstod */}
      {showPreview && (
        <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-border/50 pt-2.5 text-xs">
          <span className="inline-flex items-center gap-1 text-primary">
            <Sparkles className="size-3.5" />
            Forstået:
          </span>
          {parsed?.deadline && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 font-medium text-primary">
              <CalendarClock className="size-3.5" />
              {formatWhen(parsed.deadline)}
            </span>
          )}
          {parsedCat && (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1 font-medium">
              {parsedCat.emoji} {parsedCat.label}
            </span>
          )}
          {parsed?.workspace && (
            <span className="rounded-full bg-secondary px-2 py-1 font-medium">
              {workspaces[parsed.workspace].label}
            </span>
          )}
          {parsed?.priority && (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1 font-medium">
              <span className={cn("size-2 rounded-full", priorities[parsed.priority].dot)} />
              {priorities[parsed.priority].label}
            </span>
          )}
        </div>
      )}

      {/* Overstyring (står på Auto som standard) */}
      <div className="mt-2 flex flex-wrap gap-2 border-t border-border/50 pt-2.5">
        <select name="workspace" defaultValue="auto" className={selectClass} aria-label="Verden">
          <option value="auto">Verden: Auto</option>
          {(Object.keys(workspaces) as (keyof typeof workspaces)[]).map((w) => (
            <option key={w} value={w}>{workspaces[w].label}</option>
          ))}
        </select>

        <select name="bucket" defaultValue="auto" className={selectClass} aria-label="Hvornår">
          <option value="auto">Hvornår: Auto</option>
          {bucketOrder.map((b) => (
            <option key={b} value={b}>{buckets[b].label}</option>
          ))}
        </select>

        <select name="priority" defaultValue="auto" className={selectClass} aria-label="Prioritet">
          <option value="auto">Prioritet: Auto</option>
          {priorityOrder.map((p) => (
            <option key={p} value={p}>{priorities[p].emoji} {priorities[p].label}</option>
          ))}
        </select>

        <select name="category" defaultValue="auto" className={selectClass} aria-label="Kategori">
          <option value="auto">Kategori: Auto</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
          ))}
        </select>
      </div>
    </form>
  );
}
