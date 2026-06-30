"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Lightbulb, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  MarketingModal,
  Field,
  EmptyState,
  ChoiceGrid,
  fieldArea,
} from "@/components/markedsfoering/ui";
import { ideaKinds, ideaKindOrder, type IdeaKind } from "@/features/marketing/constants";
import {
  createIdea,
  updateIdea,
  toggleIdeaFavorite,
  deleteIdea,
} from "@/features/marketing/actions";
import type { MarketingIdea } from "@/features/marketing/types";

export function IdeabankTab({
  ideas,
  autoCreate = false,
}: {
  ideas: MarketingIdea[];
  autoCreate?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<MarketingIdea | null>(null);
  const [filter, setFilter] = React.useState<IdeaKind | "all" | "fav">("all");
  const opened = React.useRef(false);

  React.useEffect(() => {
    if (autoCreate && !opened.current) {
      opened.current = true;
      setEditing(null);
      setOpen(true);
    }
  }, [autoCreate]);

  const shown = ideas.filter((i) => {
    if (filter === "all") return true;
    if (filter === "fav") return i.favorite;
    return i.kind === filter;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>Alle</FilterChip>
          <FilterChip active={filter === "fav"} onClick={() => setFilter("fav")}>⭐ Favoritter</FilterChip>
          {ideaKindOrder.map((k) => (
            <FilterChip key={k} active={filter === k} onClick={() => setFilter(k)}>
              {ideaKinds[k].emoji} {ideaKinds[k].label}
            </FilterChip>
          ))}
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }} className="shrink-0 gap-1.5">
          <Plus className="size-4" /> Ny idé
        </Button>
      </div>

      {shown.length === 0 ? (
        <EmptyState icon={Lightbulb} text="Ingen idéer her endnu. Gem din første idé – det tager to sekunder." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((idea) => {
            const k = idea.kind ? ideaKinds[idea.kind as IdeaKind] : undefined;
            return (
              <Card key={idea.id} interactive className="group flex flex-col gap-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <button
                    onClick={() => { setEditing(idea); setOpen(true); }}
                    className="min-w-0 flex-1 text-left font-medium hover:underline"
                  >
                    {idea.title}
                  </button>
                  <button
                    aria-label="Favorit"
                    onClick={() => toggleIdeaFavorite(idea.id, !idea.favorite).then(() => router.refresh())}
                    className={cn("shrink-0", idea.favorite ? "text-yellow-400" : "text-muted-foreground/50 hover:text-yellow-400")}
                  >
                    <Star className={cn("size-4", idea.favorite && "fill-current")} />
                  </button>
                </div>
                {idea.body && <p className="line-clamp-3 text-sm text-muted-foreground">{idea.body}</p>}
                <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                  <div className="flex flex-wrap gap-1">
                    {k && <Badge variant="secondary">{k.emoji} {k.label}</Badge>}
                    {idea.tags.slice(0, 2).map((t) => (
                      <Badge key={t} variant="outline">#{t}</Badge>
                    ))}
                  </div>
                  <button
                    aria-label="Slet"
                    onClick={() => deleteIdea(idea.id).then(() => router.refresh())}
                    className="text-muted-foreground/60 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <IdeaModal open={open} editing={editing} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); router.refresh(); }} />
    </div>
  );
}

function IdeaModal({
  open,
  editing,
  onClose,
  onSaved,
}: {
  open: boolean;
  editing: MarketingIdea | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [kind, setKind] = React.useState<IdeaKind>("bil");
  const [tags, setTags] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [seeded, setSeeded] = React.useState<string | null>(null);
  const want = open ? editing?.id ?? "new" : null;
  if (want !== seeded) {
    setSeeded(want);
    if (want) {
      setTitle(editing?.title ?? "");
      setBody(editing?.body ?? "");
      setKind((editing?.kind as IdeaKind) ?? "bil");
      setTags((editing?.tags ?? []).join(", "));
    }
  }

  function save() {
    if (!title.trim()) {
      toast.error("Idéen mangler en titel.");
      return;
    }
    setPending(true);
    const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
    const run = editing
      ? updateIdea(editing.id, { title: title.trim(), body: body.trim() || null, kind, tags: tagList })
      : createIdea({ title, body, kind, tags: tagList });
    run.then((res) => {
      setPending(false);
      if (res?.error) toast.error(res.error);
      else { toast.success(editing ? "Idé gemt ✓" : "Idé gemt ✓"); onSaved(); }
    });
  }

  return (
    <MarketingModal
      open={open}
      title={editing ? "Rediger idé" : "Ny idé"}
      icon={<Lightbulb className="size-4" />}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={pending}>Annullér</Button>
          <Button onClick={save} disabled={pending}>{pending ? "Gemmer …" : "Gem idé"}</Button>
        </>
      }
    >
      <Field label="Titel"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="fx POV: dagen som bilsælger" autoFocus /></Field>
      <Field label="Beskrivelse">
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} className={fieldArea} placeholder="Beskriv idéen …" />
      </Field>
      <Field label="Type">
        <ChoiceGrid options={ideaKindOrder.map((k) => ({ id: k, label: ideaKinds[k].label, emoji: ideaKinds[k].emoji }))} value={kind} onChange={setKind} />
      </Field>
      <Field label="Tags (komma-adskilt)"><Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="fx forår, tilbud, suv" /></Field>
    </MarketingModal>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
        active ? "border-primary/40 bg-primary/10 text-primary" : "border-border/60 bg-secondary/30 text-muted-foreground hover:bg-secondary",
      )}
    >
      {children}
    </button>
  );
}
