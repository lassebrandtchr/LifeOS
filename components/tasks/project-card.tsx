"use client";

import { StickyNote } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { workspaces } from "@/features/tasks/constants";
import { useOpenDetail } from "@/components/tasks/detail-context";
import type { Project } from "@/features/tasks/types";

function noteExcerpt(notes: string | null): string | null {
  if (!notes) return null;
  const clean = notes.replace(/\s+/g, " ").trim();
  if (!clean) return null;
  return clean.length > 80 ? clean.slice(0, 79).trimEnd() + "…" : clean;
}

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("da-DK", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** ProjectCard – klikbart projektkort, der åbner detalje-visningen. */
export function ProjectCard({ project }: { project: Project }) {
  const { open } = useOpenDetail();
  const excerpt = noteExcerpt(project.notes);
  const deadline = formatDate(project.deadline);

  return (
    <Card
      interactive
      onClick={() => open({ type: "project", project })}
      className="flex cursor-pointer flex-col gap-2 p-5"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">{project.name}</h3>
        <Badge variant="secondary">
          {workspaces[project.workspace]?.label ?? project.workspace}
        </Badge>
      </div>
      {project.description && (
        <p className="text-sm text-muted-foreground">{project.description}</p>
      )}
      {excerpt && (
        <p className="flex items-center gap-1 truncate text-xs text-muted-foreground/80">
          <StickyNote className="size-3 shrink-0" />
          {excerpt}
        </p>
      )}
      <div className="mt-auto pt-2 text-xs text-muted-foreground">
        {deadline ? `Deadline: ${deadline}` : "Ingen deadline"}
      </div>
    </Card>
  );
}
