"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Loader2,
  ListChecks,
  ListTodo,
  CheckCircle2,
  Layers,
  FolderKanban,
  StickyNote,
  Mail,
  FileText,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { priorities } from "@/features/tasks/constants";
import { searchAction } from "@/features/tasks/actions";
import { stripHtmlInline } from "@/lib/text/strip-html";
import { useOpenDetail } from "@/components/tasks/detail-context";
import type { SearchResults, TaskSearchStatus } from "@/features/tasks/queries";
import type { Task, Project } from "@/features/tasks/types";

const TASK_STATUS_LABEL: Record<TaskSearchStatus, string> = {
  all: "Alle",
  active: "Aktive",
  completed: "Afsluttede",
};

/** Klik skifter rundt: Alle → Aktive → Afsluttede → Alle. */
const NEXT_TASK_STATUS: Record<TaskSearchStatus, TaskSearchStatus> = {
  all: "active",
  active: "completed",
  completed: "all",
};

const EMPTY: SearchResults = {
  tasks: [],
  projects: [],
  notes: [],
  emails: [],
  notion: [],
};

/**
 * GlobalSearch – søgefeltet i topbaren. Søger på tværs af opgaver og projekter,
 * mens man skriver (debounced), og viser resultater i et dropdown.
 */
export function GlobalSearch() {
  const router = useRouter();
  const { open: openDetail } = useOpenDetail();
  const [query, setQuery] = React.useState("");
  // Standard = "Alle": man skal kunne finde en gammel kunde igen uden først at
  // skulle gætte, om opgaven er lukket. Før stod den på "Aktive", så alt
  // afsluttet var usynligt i søgningen.
  const [taskStatus, setTaskStatus] = React.useState<TaskSearchStatus>("all");
  const [results, setResults] = React.useState<SearchResults>(EMPTY);
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Debounced søgning – kører også når taskStatus skifter (uden debounce,
  // da det er et bevidst klik og ikke tastetryk-for-tastetryk), så man med
  // det samme ser opgaverne for den nyvalgte status.
  React.useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults(EMPTY);
      return;
    }
    // Alle state-opdateringer sker inde i timeren (asynkront), så vi undgår
    // synkrone setState-kald direkte i effekten.
    const timer = setTimeout(
      async () => {
        setPending(true);
        const res = await searchAction(q, taskStatus);
        setResults(res);
        setPending(false);
        setOpen(true);
      },
      250,
    );
    return () => clearTimeout(timer);
  }, [query, taskStatus]);

  // Luk ved klik udenfor
  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const hasResults =
    results.tasks.length > 0 ||
    results.projects.length > 0 ||
    results.notes.length > 0 ||
    results.emails.length > 0 ||
    results.notion.length > 0;

  function go(path: string) {
    setOpen(false);
    setQuery("");
    router.push(path);
  }

  /** Åbn en opgave direkte i detalje-modalen (samme som fra opgavekortene). */
  function openTask(task: Task) {
    setOpen(false);
    setQuery("");
    openDetail({ type: "task", task });
  }

  /** Åbn et projekt direkte i detalje-modalen. */
  function openProject(project: Project) {
    setOpen(false);
    setQuery("");
    openDetail({ type: "project", project });
  }

  /** Åbn et eksternt link (fx en Notion-side) i en ny fane. */
  function openExternal(url: string | null) {
    setOpen(false);
    setQuery("");
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="flex h-10 w-full items-center gap-2 rounded-xl border border-border/60 bg-card px-3 text-muted-foreground focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/40">
        <Search className="size-4 shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => hasResults && setOpen(true)}
          placeholder="Søg i LifeOS …"
          className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
        {pending && <Loader2 className="size-4 shrink-0 animate-spin" />}

        {/* Skifter om opgave-resultater viser ALLE, kun aktive eller kun
            afsluttede opgaver. Standard er "Alle", så intet er skjult.
            Projekter/noter/mails/Notion påvirkes ikke – kun opgave-status. */}
        <button
          type="button"
          onClick={() => setTaskStatus((s) => NEXT_TASK_STATUS[s])}
          title={`Viser ${TASK_STATUS_LABEL[
            taskStatus
          ].toLowerCase()} opgaver – klik for at skifte til ${TASK_STATUS_LABEL[
            NEXT_TASK_STATUS[taskStatus]
          ].toLowerCase()}`}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border/60 bg-secondary/60 px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
        >
          {taskStatus === "all" ? (
            <Layers className="size-3.5 shrink-0 text-primary" />
          ) : taskStatus === "active" ? (
            <ListTodo className="size-3.5 shrink-0 text-teal-600 dark:text-teal-400" />
          ) : (
            <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          )}
          <span className="hidden sm:inline">{TASK_STATUS_LABEL[taskStatus]}</span>
        </button>
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-xl border border-border/70 bg-popover p-1.5 shadow-soft-lg">
          {!hasResults ? (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">
              {pending ? "Søger …" : "Ingen resultater."}
            </p>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {results.tasks.length > 0 && (
                <Group label={`Opgaver · ${TASK_STATUS_LABEL[taskStatus]}`}>
                  {results.tasks.map((t) => {
                    // Serveren sorterer aktive ØVERST og afsluttede nedenunder.
                    // Afsluttede dæmpes + får et "Afsluttet"-mærke, så man ved
                    // et blik kan se, hvor den aktive del af listen slutter.
                    const closed = t.status === "done" || t.status === "archived";
                    return (
                      <button
                        key={t.id}
                        onClick={() => openTask(t)}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-secondary"
                      >
                        <span
                          className={cn(
                            "size-2 shrink-0 rounded-full",
                            priorities[t.priority]?.dot ?? "bg-muted-foreground",
                          )}
                        />
                        {closed ? (
                          <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <ListChecks className="size-4 shrink-0 text-muted-foreground" />
                        )}
                        <span
                          className={cn(
                            "min-w-0 flex-1 truncate",
                            closed && "text-muted-foreground line-through",
                          )}
                        >
                          {stripHtmlInline(t.title)}
                        </span>
                        {closed && (
                          <span className="shrink-0 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                            Afsluttet
                          </span>
                        )}
                      </button>
                    );
                  })}
                </Group>
              )}
              {results.projects.length > 0 && (
                <Group label="Projekter">
                  {results.projects.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => openProject(p)}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-secondary"
                    >
                      <FolderKanban className="size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">{p.name}</span>
                    </button>
                  ))}
                </Group>
              )}
              {results.notes.length > 0 && (
                <Group label="Noter">
                  {results.notes.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => go("/opgaver")}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-secondary"
                    >
                      <StickyNote className="size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">
                        {n.title || stripHtmlInline(n.body)}
                      </span>
                    </button>
                  ))}
                </Group>
              )}
              {results.emails.length > 0 && (
                <Group label="Mails">
                  {results.emails.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => go("/mail")}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-secondary"
                    >
                      <Mail className="size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">{m.subject}</span>
                    </button>
                  ))}
                </Group>
              )}
              {results.notion.length > 0 && (
                <Group label="Notion">
                  {results.notion.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => openExternal(n.url)}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-secondary"
                    >
                      <FileText className="size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">{n.title}</span>
                    </button>
                  ))}
                </Group>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Group({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-1">
      <p className="px-2.5 py-1 text-xs font-medium text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  );
}
