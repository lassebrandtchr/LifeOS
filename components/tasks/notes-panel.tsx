"use client";

import * as React from "react";
import { useActionState } from "react";
import { Pin, PinOff, Trash2, Search, NotebookPen } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { workspaces, type Workspace } from "@/features/tasks/constants";
import {
  createNote,
  toggleNotePinned,
  deleteNote,
} from "@/features/tasks/actions";
import type { Note } from "@/features/tasks/types";

const selectClass =
  "h-10 rounded-lg border border-input bg-card px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

/**
 * NotesPanel – LifeOS' "second brain"-fundament. Gem noter, idéer og
 * observationer. Søgbart og klar til fremtidige AI-agenter.
 */
export function NotesPanel({ notes }: { notes: Note[] }) {
  const [state, action, pending] = useActionState(createNote, undefined);
  const [query, setQuery] = React.useState("");
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    if (state?.error) toast.error(state.error);
    if (state?.ok) {
      toast.success("Note gemt.");
      formRef.current?.reset();
    }
  }, [state]);

  const filtered = notes.filter((n) =>
    `${n.title ?? ""} ${n.body ?? ""}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="space-y-5">
      {/* Opret note */}
      <form
        ref={formRef}
        action={action}
        className="space-y-3 rounded-2xl border border-border/60 bg-card p-3 shadow-soft"
      >
        <Input
          name="title"
          placeholder="Titel (valgfri)"
          autoComplete="off"
          className="border-0 bg-transparent shadow-none focus-visible:ring-0"
        />
        <textarea
          name="body"
          required
          rows={3}
          placeholder="Skriv en note, idé eller observation …"
          className="w-full resize-none rounded-xl border border-input bg-background/50 p-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <select name="workspace" defaultValue="private" className={selectClass} aria-label="Verden">
            {(Object.keys(workspaces) as Workspace[]).map((w) => (
              <option key={w} value={w}>{workspaces[w].label}</option>
            ))}
          </select>
          <Button type="submit" disabled={pending} className="gap-1.5">
            <NotebookPen className="size-4" />
            {pending ? "Gemmer …" : "Gem note"}
          </Button>
        </div>
      </form>

      {/* Søg */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Søg i noter …"
          className="pl-9"
        />
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/60 px-6 py-14 text-center">
          <NotebookPen className="size-7 text-muted-foreground" />
          <p className="max-w-sm text-sm text-muted-foreground">
            Ingen noter endnu. Gem din første idé eller observation ovenfor – alt
            bliver søgbart og er klar til fremtidige AI-assistenter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((note) => (
            <Card
              key={note.id}
              interactive
              className={cn(
                "group flex flex-col gap-2 p-4",
                note.pinned && "border-primary/30",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                {note.title ? (
                  <h3 className="font-semibold leading-snug">{note.title}</h3>
                ) : (
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">
                    {workspaces[note.workspace]?.label}
                  </span>
                )}
                <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    aria-label={note.pinned ? "Frigør" : "Fastgør"}
                    onClick={() => toggleNotePinned(note.id, !note.pinned)}
                    className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    {note.pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
                  </button>
                  <button
                    type="button"
                    aria-label="Slet note"
                    onClick={() => deleteNote(note.id)}
                    className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {note.body}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
