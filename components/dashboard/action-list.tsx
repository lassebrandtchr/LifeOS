"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Phone, Mail, ListTodo, RefreshCw, Plus, ArrowRight } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { SectionCard } from "@/components/dashboard/section-card";
import { useOpenDetail } from "@/components/tasks/detail-context";
import { setTaskStatus, quickCreateTask } from "@/features/tasks/actions";
import { syncEverythingNow } from "@/features/integrations/actions";
import { priorities } from "@/features/tasks/constants";
import type { Workspace, Priority } from "@/features/tasks/constants";
import type { ActionItem, ActionListGroups } from "@/features/dashboard/action-list";

const GROUP_ORDER: Exclude<Priority, "low">[] = ["urgent", "important", "can_wait"];

/**
 * Action-liste – prioriteret overblik (Haster/Vigtigt/Kan vente), kombineret
 * fra opgaver + indbakke-mail. Erstatter den tidligere WorkspaceTasks-boks.
 *
 * `limit` + `viewAllHref`: bruges af forsidens lille udgave (lige under
 * "Hurtige handlinger") til kun at vise de vigtigste linjer, med et link til
 * hele listen på undersiden – uden at duplikere UI'et/logikken.
 */
export function ActionList({
  groups,
  workspace,
  limit,
  viewAllHref,
}: {
  groups: ActionListGroups;
  workspace: Workspace;
  limit?: number;
  viewAllHref?: string;
}) {
  const router = useRouter();
  const [removedTaskIds, setRemovedTaskIds] = useState<ReadonlySet<string>>(new Set());
  const [refreshing, startRefresh] = useTransition();

  function handleComplete(taskId: string) {
    setRemovedTaskIds((prev) => new Set(prev).add(taskId));
    void setTaskStatus(taskId, "done");
  }

  function handleRefresh() {
    startRefresh(async () => {
      const res = await syncEverythingNow();
      if (res?.error) toast.error(res.error);
      else {
        toast.success(res?.message ?? "Opdateret ✓");
        router.refresh();
      }
    });
  }

  const visible: Record<Exclude<Priority, "low">, ActionItem[]> = {
    urgent: groups.urgent.filter((i) => !i.task || !removedTaskIds.has(i.task.id)),
    important: groups.important.filter((i) => !i.task || !removedTaskIds.has(i.task.id)),
    can_wait: groups.can_wait.filter((i) => !i.task || !removedTaskIds.has(i.task.id)),
  };
  const total = visible.urgent.length + visible.important.length + visible.can_wait.length;

  // Skær ned til `limit` linjer i alt (Haster går forud for Vigtigt, som går
  // forud for Kan vente), uden at ændre den underliggende rækkefølge.
  let remaining = limit ?? Infinity;
  const shown: Record<Exclude<Priority, "low">, ActionItem[]> = { urgent: [], important: [], can_wait: [] };
  for (const key of GROUP_ORDER) {
    if (remaining <= 0) break;
    shown[key] = visible[key].slice(0, remaining);
    remaining -= shown[key].length;
  }
  const hiddenCount = total - (shown.urgent.length + shown.important.length + shown.can_wait.length);

  return (
    <SectionCard title="Action-liste" icon={ListTodo}>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {total === 0 ? "Intet der kræver handling lige nu." : `${total} ting kræver din opmærksomhed`}
        </p>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-60"
        >
          <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} />
          Opdater nu
        </button>
      </div>

      {total === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Ingen opgaver eller mails kræver handling lige nu – godt gået!
        </p>
      ) : (
        <div className="space-y-4">
          {GROUP_ORDER.map((key) => {
            const list = shown[key];
            if (list.length === 0) return null;
            return (
              <div key={key}>
                <p
                  className={cn(
                    "mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest",
                    priorities[key].text,
                  )}
                >
                  <span className={cn("size-1.5 rounded-full", priorities[key].dot)} />
                  {priorities[key].label} · {visible[key].length}
                </p>
                <ul className="space-y-0.5">
                  {list.map((item) => (
                    <ActionRow
                      key={item.id}
                      item={item}
                      workspace={workspace}
                      onComplete={handleComplete}
                    />
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {viewAllHref && (hiddenCount > 0 || total > 0) && (
        <Link
          href={viewAllHref}
          className="mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-border/60 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          {hiddenCount > 0 ? `Se hele listen (${hiddenCount} mere)` : "Se hele listen"}
          <ArrowRight className="size-3.5" />
        </Link>
      )}
    </SectionCard>
  );
}

function ActionRow({
  item,
  workspace,
  onComplete,
}: {
  item: ActionItem;
  workspace: Workspace;
  onComplete: (taskId: string) => void;
}) {
  const { open } = useOpenDetail();
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  const clickable = Boolean(item.task);

  async function handleCreateTask() {
    if (creating) return;
    setCreating(true);
    const res = await quickCreateTask({
      title: item.title,
      workspace,
      priority: item.priority,
    });
    setCreating(false);
    if (res?.error) toast.error(res.error);
    else {
      toast.success("Opgave oprettet ✓");
      router.refresh();
    }
  }

  return (
    <li
      onClick={clickable ? () => open({ type: "task", task: item.task! }) : undefined}
      className={cn(
        "-mx-1.5 flex items-start gap-2.5 rounded-lg px-1.5 py-1.5 transition-colors",
        clickable && "cursor-pointer hover:bg-secondary/50",
      )}
    >
      {item.task ? (
        <button
          type="button"
          aria-label="Markér som færdig"
          onClick={(e) => {
            e.stopPropagation();
            onComplete(item.task!.id);
          }}
          className="mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full border-2 border-border text-transparent transition-colors hover:border-success hover:text-success"
        >
          <Check className="size-2.5" />
        </button>
      ) : (
        <span className="mt-0.5 size-[18px] shrink-0" />
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-snug">{item.title}</p>
        {item.context && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.context}</p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {item.sourceLabel}
          </span>
          {item.contact?.phone && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Phone className="size-3" /> {item.contact.phone}
            </span>
          )}
          {item.contact?.email && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Mail className="size-3" /> {item.contact.email}
            </span>
          )}
        </div>
      </div>

      {!item.task && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            void handleCreateTask();
          }}
          disabled={creating}
          className="mt-0.5 flex shrink-0 items-center gap-1 rounded-lg border border-border/60 px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-60"
        >
          <Plus className="size-3" />
          Opret opgave
        </button>
      )}
    </li>
  );
}
