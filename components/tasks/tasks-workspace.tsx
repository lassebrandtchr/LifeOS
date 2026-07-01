"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Search, FolderKanban, History, Activity, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { QuickAdd } from "@/components/tasks/quick-add";
import { TaskSection } from "@/components/tasks/task-section";
import { NewProjectForm } from "@/components/tasks/new-project-form";
import { ProjectCard } from "@/components/tasks/project-card";
import { useOpenDetail } from "@/components/tasks/detail-context";
import { bucketOrder, type Workspace } from "@/features/tasks/constants";
import { getWorkspaceOrder } from "@/features/tasks/section-order";
import type {
  Task,
  TasksByBucket,
  Project,
  TaskHistory,
  TaskActivity,
} from "@/features/tasks/types";

type Tab = "opgaver" | "projekter" | "historik" | "aktivitet";
export type TaskFilter = "urgent" | "overdue" | "today" | "important";

const tabs: { id: Tab; label: string }[] = [
  { id: "opgaver", label: "Opgaver" },
  { id: "projekter", label: "Projekter" },
  { id: "historik", label: "Historik" },
  { id: "aktivitet", label: "Aktivitet" },
];

const filterLabel: Record<TaskFilter, string> = {
  urgent: "Hasteopgaver",
  overdue: "Forfaldne opgaver",
  today: "Planlagt til i dag",
  important: "Vigtige opgaver denne uge",
};

/** Filtrer bucket-grupperne, så de kun indeholder én verdens opgaver. */
function bucketsForWorkspace(
  all: TasksByBucket,
  workspace: Workspace,
): TasksByBucket {
  const result = { today: [], week: [], later: [] } as TasksByBucket;
  for (const b of bucketOrder) {
    result[b] = all[b].filter((t) => t.workspace === workspace);
  }
  return result;
}

/** Filtrer bucket-grupperne yderligere ned til fx haster/forfaldne/i dag – matcher
 *  samme logik som forsidens "Arbejdsoverblik" (features/dashboard/stats.ts). */
function applyTaskFilter(buckets: TasksByBucket, filter?: TaskFilter): TasksByBucket {
  if (!filter) return buckets;
  const today0 = new Date();
  today0.setHours(0, 0, 0, 0);
  const matches = (t: Task) => {
    if (filter === "urgent") return t.priority === "urgent";
    if (filter === "overdue") return !!t.deadline && new Date(t.deadline).getTime() < today0.getTime();
    if (filter === "important") return t.priority === "important" && (t.bucket === "today" || t.bucket === "week");
    return t.bucket === "today";
  };
  const result = { today: [], week: [], later: [] } as TasksByBucket;
  for (const b of bucketOrder) {
    result[b] = buckets[b].filter(matches);
  }
  return result;
}

const activityLabel: Record<string, string> = {
  created: "Oprettet",
  edited: "Redigeret",
  moved: "Flyttet",
  completed: "Afsluttet",
  archived: "Arkiveret",
};

function formatDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("da-DK", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Åbner automatisk én opgaves detalje-visning (når man kommer fra en genvej). */
function AutoOpen({ task }: { task: Task | null }) {
  const { open } = useOpenDetail();
  const done = React.useRef(false);
  React.useEffect(() => {
    if (task && !done.current) {
      done.current = true;
      open({ type: "task", task });
    }
  }, [task, open]);
  return null;
}

export function TasksWorkspace({
  initialBuckets,
  projects,
  history,
  activity,
  completedCounts,
  initialOrder,
  openTaskId,
  initialFilter,
}: {
  initialBuckets: TasksByBucket;
  projects: Project[];
  history: TaskHistory[];
  activity: TaskActivity[];
  completedCounts: Record<Workspace, number>;
  initialOrder: Workspace[];
  openTaskId?: string;
  initialFilter?: TaskFilter;
}) {
  const [tab, setTab] = React.useState<Tab>("opgaver");

  // Find den opgave, en genvej bad os åbne (hvis nogen).
  const openTask = React.useMemo(() => {
    if (!openTaskId) return null;
    for (const b of bucketOrder) {
      const hit = initialBuckets[b].find((t) => t.id === openTaskId);
      if (hit) return hit;
    }
    return null;
  }, [openTaskId, initialBuckets]);
  const [historyQuery, setHistoryQuery] = React.useState("");

  // Rækkefølge af sektionerne (auto-prioritering efter arbejdstid).
  // Starter med server-værdien (ingen mismatch) og gentjekkes hvert minut,
  // så den glider på plads med animation, hvis den skifter mens siden er åben.
  const [order, setOrder] = React.useState<Workspace[]>(initialOrder);
  React.useEffect(() => {
    const id = setInterval(() => setOrder(getWorkspaceOrder()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Filter fra forsidens "Arbejdsoverblik" (fx ?filter=urgent). Lokal state,
  // så "×" kan rydde filteret uden en ny sidenavigation.
  const [activeFilter, setActiveFilter] = React.useState<TaskFilter | undefined>(initialFilter);

  // Opdel opgaver og projekter pr. verden (memoiseret for stabile referencer).
  const sectionData = React.useMemo(() => {
    const map = {} as Record<
      Workspace,
      { buckets: TasksByBucket; projects: Project[] }
    >;
    for (const ws of ["work", "private"] as Workspace[]) {
      map[ws] = {
        buckets: applyTaskFilter(bucketsForWorkspace(initialBuckets, ws), activeFilter),
        projects: projects.filter((p) => p.workspace === ws),
      };
    }
    return map;
  }, [initialBuckets, projects, activeFilter]);

  const filteredHistory = history.filter((h) =>
    (h.title ?? "").toLowerCase().includes(historyQuery.toLowerCase()),
  );

  return (
    <>
    <AutoOpen task={openTask} />
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Opgaver</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Dit second brain – opgaver, projekter og historik på tværs af privat
          og Storgaard Biler.
        </p>
      </div>

      {activeFilter && (
        <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3.5 py-2 text-sm font-medium text-primary">
          <span>Viser: {filterLabel[activeFilter]}</span>
          <button
            type="button"
            onClick={() => setActiveFilter(undefined)}
            aria-label="Ryd filter"
            className="ml-auto flex size-5 items-center justify-center rounded-full text-primary/70 transition-colors hover:bg-primary/15 hover:text-primary"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* Faner */}
      <div className="flex gap-1 rounded-xl border border-border/60 bg-card p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "relative isolate flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              tab === t.id
                ? "text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab === t.id && (
              <motion.span
                layoutId="tasks-tab"
                className="absolute inset-0 rounded-lg bg-primary shadow-glow"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            <span className="relative z-10">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Indhold */}
      {tab === "opgaver" && (
        <div className="space-y-5">
          <QuickAdd />
          {/* To tydeligt adskilte sektioner. Rækkefølgen styres af arbejdstid
              og animeres med Framer Motion layout, når den skifter. */}
          <div className="space-y-5">
            {order.map((ws) => (
              <TaskSection
                key={ws}
                workspace={ws}
                buckets={sectionData[ws].buckets}
                projects={sectionData[ws].projects}
                doneCount={completedCounts[ws] ?? 0}
              />
            ))}
          </div>
        </div>
      )}

      {tab === "projekter" && (
        <div className="space-y-5">
          <NewProjectForm />
          {projects.length === 0 ? (
            <EmptyState
              icon={FolderKanban}
              text="Ingen projekter endnu. Opret dit første projekt ovenfor."
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "historik" && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={historyQuery}
              onChange={(e) => setHistoryQuery(e.target.value)}
              placeholder="Søg i historik …"
              className="pl-9"
            />
          </div>
          {filteredHistory.length === 0 ? (
            <EmptyState
              icon={History}
              text="Ingen færdige opgaver endnu. Når du fuldfører opgaver, gemmes de her i op til 12 måneder."
            />
          ) : (
            <Card className="divide-y divide-border/50">
              {filteredHistory.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between gap-3 p-4"
                >
                  <span className="text-sm font-medium line-through decoration-muted-foreground/40">
                    {h.title ?? "Opgave"}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    Afsluttet {formatDateTime(h.created_at)}
                  </span>
                </div>
              ))}
            </Card>
          )}
        </div>
      )}

      {tab === "aktivitet" && (
        <div>
          {activity.length === 0 ? (
            <EmptyState
              icon={Activity}
              text="Ingen aktivitet endnu. Her kan du senere se: hvad har jeg egentlig fået lavet?"
            />
          ) : (
            <Card className="divide-y divide-border/50">
              {activity.map((a) => (
                <div key={a.id} className="flex items-center gap-3 p-4">
                  <Badge variant="secondary" className="shrink-0">
                    {activityLabel[a.type] ?? a.type}
                  </Badge>
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {(a.detail?.title as string) ?? "Opgave"}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDateTime(a.created_at)}
                  </span>
                </div>
              ))}
            </Card>
          )}
        </div>
      )}
    </div>
    </>
  );
}

function EmptyState({
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
