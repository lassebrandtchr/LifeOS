"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { X, StickyNote, FolderKanban, CheckSquare, Type, Car, Bell } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AutoGrowTextarea } from "@/components/ui/autogrow-textarea";
import {
  categories,
  priorities,
  priorityOrder,
  workspaces,
  type Workspace,
  type Priority,
  type Bucket,
} from "@/features/tasks/constants";
import { updateTask, updateProjectNotes } from "@/features/tasks/actions";
import { deriveBucketFromDeadline } from "@/features/tasks/bucket";
import { TaskAttachments } from "@/components/tasks/task-attachments";
import { DeadlinePicker } from "@/components/tasks/deadline-picker";
import { RichTextEditor } from "@/components/ui/rich-text-editor/lazy";
import type { Task, Project } from "@/features/tasks/types";

export type DetailItem =
  | { type: "task"; task: Task }
  | { type: "project"; project: Project };

type Ctx = { open: (item: DetailItem) => void };
const DetailContext = React.createContext<Ctx>({ open: () => {} });

/** Hook: kald `open(item)` fra et opgave-/projektkort for at åbne detaljen. */
export const useOpenDetail = () => React.useContext(DetailContext);

const selectClass =
  "h-10 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40";

/** ISO → værdi til <input type="datetime-local"> (lokal tid). */
function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function localInputToIso(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * DetailProvider – centreret modal til at REDIGERE en opgave (alle felter:
 * emne, verden, prioritet, status, hvornår, kategori, deadline, note) og
 * vedhæfte filer. Projekter beholder den enkle note-redigering.
 */
export function DetailProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [item, setItem] = React.useState<DetailItem | null>(null);
  const [pending, startTransition] = React.useTransition();

  const open = React.useCallback((i: DetailItem) => setItem(i), []);
  const close = React.useCallback(() => setItem(null), []);

  React.useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [item, close]);

  return (
    <DetailContext.Provider value={{ open }}>
      {children}

      <AnimatePresence>
        {item && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(e) => e.target === e.currentTarget && close()}
          >
            <motion.div
              className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-card border border-border/70 bg-card shadow-soft-lg"
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
            >
              {item.type === "task" ? (
                <TaskEditor
                  key={item.task.id}
                  task={item.task}
                  pending={pending}
                  onClose={close}
                  onSave={(fields) =>
                    startTransition(async () => {
                      const res = await updateTask(item.task.id, fields);
                      if (res?.error) toast.error(res.error);
                      else {
                        toast.success("Opgave gemt ✓");
                        if (res?.warning) toast.warning(res.warning);
                        close();
                        router.refresh();
                      }
                    })
                  }
                />
              ) : (
                <ProjectEditor
                  key={item.project.id}
                  project={item.project}
                  pending={pending}
                  onClose={close}
                  onSave={(notes) =>
                    startTransition(async () => {
                      const res = await updateProjectNotes(item.project.id, notes);
                      if (res?.error) toast.error(res.error);
                      else {
                        toast.success("Projekt gemt ✓");
                        close();
                        router.refresh();
                      }
                    })
                  }
                />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DetailContext.Provider>
  );
}

// ─────────────────────────────── Opgave-editor ───────────────────────────
type TaskFields = {
  title: string;
  description: string | null;
  workspace: Workspace;
  priority: Priority;
  bucket: Bucket;
  category: string | null;
  deadline: string | null;
  reminder_at: string | null;
  notes: string | null;
  trade_in: string | null;
};

function TaskEditor({
  task,
  pending,
  onClose,
  onSave,
}: {
  task: Task;
  pending: boolean;
  onClose: () => void;
  onSave: (fields: TaskFields) => void;
}) {
  const [title, setTitle] = React.useState(task.title);
  const [description, setDescription] = React.useState(task.description ?? "");
  const [workspace, setWorkspace] = React.useState<Workspace>(
    task.workspace === "work" ? "work" : "private",
  );
  const [priority, setPriority] = React.useState<Priority>(task.priority);
  const [category, setCategory] = React.useState<string>(task.category ?? "");
  const [deadline, setDeadline] = React.useState(isoToLocalInput(task.deadline));
  const [reminderAt, setReminderAt] = React.useState(isoToLocalInput(task.reminder_at));
  const [notes, setNotes] = React.useState(task.notes ?? "");
  const [tradeIn, setTradeIn] = React.useState(task.trade_in ?? "");

  // Salg-opgaver (Bud på bil / Import af bil) bruger Note langt mere end
  // Beskrivelse, og har brug for et separat Byttebil-felt – så her skjules
  // Beskrivelse, Note gøres større, og Byttebil dukker op. Styres af
  // kategorien (ikke en fast oprindelses-markør), så det følger med hvis
  // man selv skifter kategori i editoren.
  const isCarDeal = category === "salg";

  // Kategorierne, der passer til den valgte verden.
  const catOptions = categories.filter((c) => c.workspace === workspace);
  // Skift verden + ryd en kategori, der ikke længere passer (uden effekt).
  function changeWorkspace(ws: Workspace) {
    setWorkspace(ws);
    if (category && !categories.some((c) => c.id === category && c.workspace === ws)) {
      setCategory("");
    }
  }

  function saveAll() {
    if (!title.trim()) {
      toast.error("Opgaven skal have et emne.");
      return;
    }
    const deadlineIso = localInputToIso(deadline);
    onSave({
      title,
      description: description.trim() || null,
      workspace,
      priority,
      // "Hvornår"-feltet er fjernet fra editoren – bucket (i dag/uge/senere)
      // udledes nu altid af deadline, i stedet for at fryse på en gammel
      // manuel værdi, hvis deadline ændres her.
      bucket: deriveBucketFromDeadline(deadlineIso ? new Date(deadlineIso) : null),
      category: category || null,
      deadline: deadlineIso,
      reminder_at: localInputToIso(reminderAt),
      notes: notes.trim() || null,
      trade_in: tradeIn.trim() || null,
    });
  }

  return (
    <>
      {/* Header (fast) */}
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border/60 px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
            <CheckSquare className="size-4" />
          </span>
          <div>
            <h2 className="text-base font-semibold leading-tight">Rediger opgave</h2>
            <span className="text-xs text-muted-foreground">
              {workspaces[workspace]?.label}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label="Luk"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Indhold (scroller kun hvis nødvendigt) */}
      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {/* Emne – vokser nedad ligesom Note, i stedet for at klippe lange titler af. */}
        <Field label="Emne" icon={Type}>
          <AutoGrowTextarea
            value={title}
            onChange={setTitle}
            placeholder="Hvad skal der ske?"
            className="font-medium"
          />
        </Field>

        {/* Verden */}
        <Field label="Verden">
          <div className="grid grid-cols-2 gap-2">
            <WorldButton active={workspace === "private"} onClick={() => changeWorkspace("private")} label="🏠 Privat" />
            <WorldButton active={workspace === "work"} onClick={() => changeWorkspace("work")} label="🚗 Storgaard" />
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Prioritet">
            <select className={selectClass} value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              {priorityOrder.map((p) => (
                <option key={p} value={p}>{priorities[p].emoji} {priorities[p].label}</option>
              ))}
            </select>
          </Field>
          <Field label="Kategori">
            <select className={selectClass} value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Ingen</option>
              {catOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
              ))}
            </select>
          </Field>
        </div>

        {/* Påmind mig – samme slags felt som Deadline, men egen (lilla)
            accentfarve, så de to kan skelnes ved et blik. Uafhængig af
            deadline: udløser en global pop op-notifikation på det valgte
            tidspunkt, uanset hvilken side man er på (se ReminderWatcher). */}
        <Field label="Påmind mig" icon={Bell}>
          <DeadlinePicker
            value={reminderAt}
            onChange={setReminderAt}
            accentColor="#a78bfa"
            icon={Bell}
            placeholderText="Sæt en påmindelse"
          />
        </Field>

        <Field label="Deadline">
          <DeadlinePicker value={deadline} onChange={setDeadline} />
        </Field>

        {/* Note – større for Salg-opgaver (Bud på bil/Import af bil), som
            bruger dette felt langt mere end Beskrivelse. */}
        <Field label="Note" icon={StickyNote}>
          <RichTextEditor
            value={notes}
            onChange={setNotes}
            minHeightClassName={isCarDeal ? "min-h-48" : "min-h-20"}
            placeholder="Skriv noter, detaljer, huskepunkter …"
          />
        </Field>

        {isCarDeal ? (
          /* Byttebil – fritekst; udfyldt tekst vises som en kort bil-info-
             badge i opgavelisten og Action-listen (features/tasks/trade-in.ts). */
          <Field label="Byttebil" icon={Car}>
            <textarea
              value={tradeIn}
              onChange={(e) => setTradeIn(e.target.value)}
              rows={2}
              placeholder="Har kunden en byttebil? Fx mærke, model, årgang, reg.nr. …"
              className="w-full resize-y rounded-xl border border-border/60 bg-background px-3.5 py-2 text-sm outline-none placeholder:text-muted-foreground/70 focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          </Field>
        ) : (
          /* Beskrivelse (valgfri) */
          <Field label="Beskrivelse (valgfri)">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Kort beskrivelse …"
              className="w-full resize-y rounded-xl border border-border/60 bg-background px-3.5 py-2 text-sm outline-none placeholder:text-muted-foreground/70 focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          </Field>
        )}

        {/* Vedhæftninger */}
        <TaskAttachments taskId={task.id} />
      </div>

      {/* Footer (fast) */}
      <div className="flex shrink-0 justify-end gap-2 border-t border-border/60 px-5 py-3">
        <Button variant="outline" onClick={onClose} disabled={pending}>
          Luk
        </Button>
        <Button onClick={saveAll} disabled={pending}>
          {pending ? "Gemmer …" : "Gem ændringer"}
        </Button>
      </div>
    </>
  );
}

// ─────────────────────────────── Projekt-editor ──────────────────────────
function ProjectEditor({
  project,
  pending,
  onClose,
  onSave,
}: {
  project: Project;
  pending: boolean;
  onClose: () => void;
  onSave: (notes: string) => void;
}) {
  const [notes, setNotes] = React.useState(project.notes ?? "");
  return (
    <>
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border/60 px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
            <FolderKanban className="size-4" />
          </span>
          <div>
            <h2 className="text-base font-semibold leading-tight">{project.name}</h2>
            <span className="text-xs text-muted-foreground">
              Projekt · {workspaces[project.workspace as Workspace]?.label ?? project.workspace}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label="Luk"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium">
          <StickyNote className="size-4 text-primary" />
          Note
        </label>
        <RichTextEditor
          value={notes}
          onChange={setNotes}
          minHeightClassName="min-h-36"
          placeholder="Skriv noter, detaljer, huskepunkter …"
        />
      </div>

      <div className="flex shrink-0 justify-end gap-2 border-t border-border/60 px-5 py-3">
        <Button variant="outline" onClick={onClose} disabled={pending}>
          Luk
        </Button>
        <Button onClick={() => onSave(notes)} disabled={pending}>
          {pending ? "Gemmer …" : "Gem note"}
        </Button>
      </div>
    </>
  );
}

// ─────────────────────────────── Små hjælpere ────────────────────────────
function Field({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon?: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {Icon && <Icon className="size-3.5" />}
        {label}
      </label>
      {children}
    </div>
  );
}

function WorldButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-10 items-center justify-center gap-2 rounded-xl border text-sm font-medium transition-colors",
        active
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border/60 bg-secondary/30 text-muted-foreground hover:bg-secondary",
      )}
    >
      {label}
    </button>
  );
}
