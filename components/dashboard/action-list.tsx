"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Phone, Mail, Car, ListTodo, RefreshCw, Plus, ArrowRight, CalendarClock, Bell } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { SectionCard } from "@/components/dashboard/section-card";
import { useOpenDetail } from "@/components/tasks/detail-context";
import { setTaskStatus, quickCreateTask } from "@/features/tasks/actions";
import { syncEverythingNow } from "@/features/integrations/actions";
import { summarizeTradeIn } from "@/features/tasks/trade-in";
import { deriveTopic, topicColor } from "@/features/tasks/topic";
import { priorities } from "@/features/tasks/constants";
import type { Workspace, Priority } from "@/features/tasks/constants";
import type { ActionItem, ActionListGroups } from "@/features/dashboard/action-list";

const GROUP_ORDER: Priority[] = ["urgent", "important", "can_wait"];

// Farvet prioritets-badge pr. opgave (erstatter de tidligere gruppe-
// overskrifter "HASTER · 3" osv.) – literal klasse-strenge, så Tailwinds
// JIT-scanner rent faktisk genererer dem (dynamisk sammensatte klassenavne
// bliver IKKE fundet af scanneren).
const priorityBadgeClass: Record<Priority, string> = {
  urgent: "border-destructive/40 bg-destructive/10 text-destructive",
  important: "border-warning/40 bg-warning/10 text-warning",
  can_wait: "border-success/40 bg-success/10 text-success",
};

/** "03.07.2026 kl 12.00" – samme format Lasse selv brugte som eksempel. */
function fmtDateBadge(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("da-DK", { day: "2-digit", month: "2-digit", year: "numeric" });
  const time = d.toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" }).replace(":", ".");
  return `${date} kl ${time}`;
}

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
        if (res?.warning) toast.warning(res.warning);
        router.refresh();
      }
    });
  }

  const visible: Record<Priority, ActionItem[]> = {
    urgent: groups.urgent.filter((i) => !i.task || !removedTaskIds.has(i.task.id)),
    important: groups.important.filter((i) => !i.task || !removedTaskIds.has(i.task.id)),
    can_wait: groups.can_wait.filter((i) => !i.task || !removedTaskIds.has(i.task.id)),
  };
  const total = visible.urgent.length + visible.important.length + visible.can_wait.length;

  // Skær ned til `limit` linjer i alt (Haster går forud for Vigtigt, som går
  // forud for Kan vente), uden at ændre den underliggende rækkefølge.
  let remaining = limit ?? Infinity;
  const shown: Record<Priority, ActionItem[]> = { urgent: [], important: [], can_wait: [] };
  for (const key of GROUP_ORDER) {
    if (remaining <= 0) break;
    shown[key] = visible[key].slice(0, remaining);
    remaining -= shown[key].length;
  }
  const hiddenCount = total - (shown.urgent.length + shown.important.length + shown.can_wait.length);
  // Én flad liste (Haster → Vigtigt → Kan vente) – prioritet vises nu som en
  // farvet badge PÅ hver linje i stedet for gruppe-overskrifter.
  const flatShown = [...shown.urgent, ...shown.important, ...shown.can_wait];

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
        <ul className="space-y-0.5">
          {flatShown.map((item) => (
            <ActionRow
              key={item.id}
              item={item}
              workspace={workspace}
              onComplete={handleComplete}
            />
          ))}
        </ul>
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
  const tradeIn = summarizeTradeIn(item.task?.trade_in);
  // For mail-elementer får emne-udledningen også afsender + uddrag som
  // signal, så badgen kan læse "hvad handler mailen om" – ikke kun emnefeltet.
  const topic = deriveTopic(
    item.title,
    item.mailThread ? `${item.mailThread.from} ${item.mailThread.snippet}` : undefined,
  );

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
        <div className="flex items-start gap-2">
          <span
            className={cn(
              "mt-0.5 inline-flex shrink-0 items-center rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
              priorityBadgeClass[item.priority] ?? priorityBadgeClass.can_wait,
            )}
          >
            {priorities[item.priority]?.label ?? priorities.can_wait.label}
          </span>
          {/* Kort auto-udledt emne ("Import", "Bud", "Karla" …) – egen farve-
              palet (blå/lilla/pink/teal/indigo), bevidst uden prioriteternes
              rød/orange/grøn, så de to badges aldrig forveksles. */}
          {topic && (
            <span
              className="mt-0.5 inline-flex shrink-0 items-center rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
              style={{
                color: topicColor(topic),
                borderColor: `color-mix(in oklab, ${topicColor(topic)} 40%, transparent)`,
                backgroundColor: `color-mix(in oklab, ${topicColor(topic)} 10%, transparent)`,
              }}
            >
              {topic}
            </span>
          )}
          <p className="min-w-0 flex-1 truncate text-sm font-medium leading-snug">{item.title}</p>
        </div>
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
          {tradeIn && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Car className="size-3" /> {tradeIn}
            </span>
          )}
          {item.task?.deadline && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
              <CalendarClock className="size-3" />
              Deadline d. {fmtDateBadge(item.task.deadline)}
            </span>
          )}
          {item.task?.reminder_at && (
            <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: "#a78bfa" }}>
              <Bell className="size-3" />
              Påmindelse d. {fmtDateBadge(item.task.reminder_at)}
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
