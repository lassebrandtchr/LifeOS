"use client";

import * as React from "react";
import { useActionState } from "react";
import { FolderPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { workspaces, type Workspace } from "@/features/tasks/constants";
import { createProject } from "@/features/tasks/actions";

const selectClass =
  "h-10 rounded-lg border border-input bg-card px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

/** Hurtig oprettelse af et nyt projekt. */
export function NewProjectForm() {
  const [state, action, pending] = useActionState(createProject, undefined);
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    if (state?.error) toast.error(state.error);
    if (state?.ok) {
      toast.success("Projekt oprettet.");
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form
      ref={formRef}
      action={action}
      className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-3 shadow-soft sm:flex-row sm:items-center"
    >
      <Input
        name="name"
        placeholder="Nyt projekt … (fx “Renovere garage”)"
        required
        autoComplete="off"
        className="h-10 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0"
      />
      <select name="workspace" defaultValue="private" className={selectClass} aria-label="Verden">
        {(Object.keys(workspaces) as Workspace[]).map((w) => (
          <option key={w} value={w}>
            {workspaces[w].label}
          </option>
        ))}
      </select>
      <input type="date" name="deadline" className={selectClass} aria-label="Deadline" />
      <Button type="submit" disabled={pending} className="gap-1.5">
        <FolderPlus className="size-4" />
        {pending ? "Opretter …" : "Opret"}
      </Button>
    </form>
  );
}
