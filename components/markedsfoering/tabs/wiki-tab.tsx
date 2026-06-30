"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, BookOpen, Pin, Trash2 } from "lucide-react";
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
import { wikiCategories, wikiCategoryOrder, type WikiCategory } from "@/features/marketing/constants";
import { createWikiPage, updateWikiPage, toggleWikiPinned, deleteWikiPage } from "@/features/marketing/actions";
import type { WikiPage } from "@/features/marketing/types";

export function WikiTab({ wiki, autoCreate = false }: { wiki: WikiPage[]; autoCreate?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<WikiPage | null>(null);
  const [cat, setCat] = React.useState<WikiCategory | "all">("all");
  const opened = React.useRef(false);
  React.useEffect(() => {
    if (autoCreate && !opened.current) { opened.current = true; setEditing(null); setOpen(true); }
  }, [autoCreate]);

  const shown = [...wiki]
    .filter((w) => cat === "all" || w.category === cat)
    .sort((a, b) => Number(b.pinned) - Number(a.pinned));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          <Chip active={cat === "all"} onClick={() => setCat("all")}>Alle</Chip>
          {wikiCategoryOrder.map((c) => (
            <Chip key={c} active={cat === c} onClick={() => setCat(c)}>{wikiCategories[c].emoji} {wikiCategories[c].label}</Chip>
          ))}
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }} className="shrink-0 gap-1.5"><Plus className="size-4" /> Ny side</Button>
      </div>

      {shown.length === 0 ? (
        <EmptyState icon={BookOpen} text="Marketingafdelingens wiki er tom. Saml brand guidelines, farver, fonte, arbejdsgange og manualer her." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {shown.map((w) => {
            const c = wikiCategories[w.category as WikiCategory] ?? wikiCategories.manualer;
            return (
              <Card key={w.id} interactive className="group flex flex-col gap-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <button onClick={() => { setEditing(w); setOpen(true); }} className="min-w-0 flex-1 text-left">
                    <span className="flex items-center gap-2 font-medium">
                      {w.pinned && <Pin className="size-3.5 shrink-0 text-primary" />}
                      <span className="truncate">{w.title}</span>
                    </span>
                  </button>
                  <Badge variant="secondary" className="shrink-0">{c.emoji} {c.label}</Badge>
                </div>
                {w.body && <p className="line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">{w.body}</p>}
                <div className="mt-auto flex justify-end gap-1 pt-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button aria-label="Fastgør" onClick={() => toggleWikiPinned(w.id, !w.pinned).then(() => router.refresh())} className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary">
                    <Pin className={cn("size-4", w.pinned && "text-primary")} />
                  </button>
                  <button aria-label="Slet" onClick={() => deleteWikiPage(w.id).then(() => router.refresh())} className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <WikiModal open={open} editing={editing} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); router.refresh(); }} />
    </div>
  );
}

function WikiModal({ open, editing, onClose, onSaved }: { open: boolean; editing: WikiPage | null; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = React.useState("");
  const [category, setCategory] = React.useState<WikiCategory>("manualer");
  const [body, setBody] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [seeded, setSeeded] = React.useState<string | null>(null);
  const want = open ? editing?.id ?? "new" : null;
  if (want !== seeded) {
    setSeeded(want);
    if (want) {
      setTitle(editing?.title ?? "");
      setCategory((editing?.category as WikiCategory) ?? "manualer");
      setBody(editing?.body ?? "");
    }
  }

  function save() {
    if (!title.trim()) { toast.error("Wiki-siden mangler en titel."); return; }
    setPending(true);
    const run = editing
      ? updateWikiPage(editing.id, { title: title.trim(), category, body: body.trim() || null })
      : createWikiPage({ title, category, body });
    run.then((res) => { setPending(false); if (res?.error) toast.error(res.error); else { toast.success("Wiki-side gemt ✓"); onSaved(); } });
  }

  return (
    <MarketingModal open={open} title={editing ? "Rediger wiki-side" : "Ny wiki-side"} icon={<BookOpen className="size-4" />} onClose={onClose}
      footer={<><Button variant="outline" onClick={onClose} disabled={pending}>Annullér</Button><Button onClick={save} disabled={pending}>{pending ? "Gemmer …" : "Gem"}</Button></>}>
      <Field label="Titel"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="fx Brand-farver" autoFocus /></Field>
      <Field label="Kategori">
        <ChoiceGrid options={wikiCategoryOrder.map((c) => ({ id: c, label: wikiCategories[c].label, emoji: wikiCategories[c].emoji }))} value={category} onChange={setCategory} columns={2} />
      </Field>
      <Field label="Indhold"><textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} className={fieldArea} placeholder="Skriv indholdet …" /></Field>
    </MarketingModal>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={cn("rounded-full border px-2.5 py-1 text-xs font-medium transition-colors", active ? "border-primary/40 bg-primary/10 text-primary" : "border-border/60 bg-secondary/30 text-muted-foreground hover:bg-secondary")}>{children}</button>
  );
}
