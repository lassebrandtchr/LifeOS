"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, ListChecks, Trash2, Check, Copy } from "lucide-react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { MarketingModal, Field, EmptyState, fieldArea } from "@/components/markedsfoering/ui";
import { starterChecklists } from "@/features/marketing/constants";
import {
  createChecklist,
  setChecklistItems,
  deleteChecklist,
  createChecklistTemplate,
  deleteChecklistTemplate,
} from "@/features/marketing/actions";
import type { Checklist, ChecklistTemplate } from "@/features/marketing/types";

export function ChecklistsTab({
  checklists,
  templates,
  autoCreate = false,
}: {
  checklists: Checklist[];
  templates: ChecklistTemplate[];
  autoCreate?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const opened = React.useRef(false);
  React.useEffect(() => {
    if (autoCreate && !opened.current) { opened.current = true; setOpen(true); }
  }, [autoCreate]);

  function toggleItem(list: Checklist, idx: number) {
    const items = list.items.map((it, i) => (i === idx ? { ...it, done: !it.done } : it));
    setChecklistItems(list.id, items).then(() => router.refresh());
  }

  function applyTemplate(name: string, items: string[]) {
    createChecklist({ name, items }).then((res) => {
      if (res?.error) toast.error(res.error);
      else { toast.success(`Checkliste "${name}" oprettet ✓`); router.refresh(); }
    });
  }

  return (
    <div className="space-y-5">
      {/* Genbrugelige skabeloner */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Start fra skabelon</h3>
        <div className="flex flex-wrap gap-2">
          {starterChecklists.map((s) => (
            <button
              key={s.name}
              type="button"
              onClick={() => applyTemplate(s.name, s.items)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-secondary/30 px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary"
            >
              <Copy className="size-3.5" /> {s.name}
            </button>
          ))}
          {templates.map((t) => (
            <span key={t.id} className="group inline-flex items-center gap-1 rounded-xl border border-border/60 bg-secondary/30 pl-3 pr-1.5 py-1.5 text-sm font-medium">
              <button type="button" onClick={() => applyTemplate(t.name, t.items)} className="inline-flex items-center gap-1.5">
                <Copy className="size-3.5" /> {t.name}
              </button>
              <button aria-label="Slet skabelon" onClick={() => deleteChecklistTemplate(t.id).then(() => router.refresh())} className="ml-1 text-muted-foreground/60 hover:text-destructive">
                <Trash2 className="size-3.5" />
              </button>
            </span>
          ))}
          <Button onClick={() => setOpen(true)} variant="outline" className="gap-1.5"><Plus className="size-4" /> Ny checkliste</Button>
        </div>
      </div>

      {/* Aktive checklister */}
      {checklists.length === 0 ? (
        <EmptyState icon={ListChecks} text="Ingen checklister endnu. Tag en skabelon ovenfor – fx “Ny bil” eller “Ny kampagne”." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {checklists.map((list) => {
            const done = list.items.filter((i) => i.done).length;
            const total = list.items.length;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            return (
              <Card key={list.id} className="group flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold">{list.name}</h3>
                    <p className="text-xs text-muted-foreground">{done}/{total} færdige</p>
                  </div>
                  <button aria-label="Slet" onClick={() => deleteChecklist(list.id).then(() => router.refresh())} className="shrink-0 text-muted-foreground/60 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100">
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary/60">
                  <div className="h-full rounded-full bg-success transition-all" style={{ width: `${pct}%` }} />
                </div>
                <ul className="space-y-1">
                  {list.items.map((it, idx) => (
                    <li key={idx}>
                      <button onClick={() => toggleItem(list, idx)} className="flex w-full items-center gap-2.5 rounded-lg px-1 py-1.5 text-left text-sm transition-colors hover:bg-secondary/40">
                        <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-md border", it.done ? "border-success bg-success/15 text-success" : "border-border/60 text-transparent")}>
                          <Check className="size-3.5" />
                        </span>
                        <span className={cn(it.done && "text-muted-foreground line-through")}>{it.text}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      )}

      <NewChecklistModal open={open} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); router.refresh(); }} />
    </div>
  );
}

function NewChecklistModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = React.useState("");
  const [itemsText, setItemsText] = React.useState("");
  const [saveTemplate, setSaveTemplate] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [seeded, setSeeded] = React.useState(false);
  if (open !== seeded) {
    setSeeded(open);
    if (open) { setName(""); setItemsText(""); setSaveTemplate(false); }
  }

  function save() {
    if (!name.trim()) { toast.error("Checklisten mangler et navn."); return; }
    const items = itemsText.split("\n").map((l) => l.trim()).filter(Boolean);
    if (items.length === 0) { toast.error("Tilføj mindst ét punkt (ét pr. linje)."); return; }
    setPending(true);
    (async () => {
      const res = await createChecklist({ name, items });
      if (res?.error) { setPending(false); toast.error(res.error); return; }
      if (saveTemplate) await createChecklistTemplate({ name, items });
      setPending(false);
      toast.success("Checkliste oprettet ✓");
      onSaved();
    })();
  }

  return (
    <MarketingModal open={open} title="Ny checkliste" icon={<ListChecks className="size-4" />} onClose={onClose}
      footer={<><Button variant="outline" onClick={onClose} disabled={pending}>Annullér</Button><Button onClick={save} disabled={pending}>{pending ? "Gemmer …" : "Opret"}</Button></>}>
      <Field label="Navn"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="fx Ny bil – VW Golf" autoFocus /></Field>
      <Field label="Punkter (ét pr. linje)">
        <textarea value={itemsText} onChange={(e) => setItemsText(e.target.value)} rows={7} className={fieldArea} placeholder={"Tag billeder\nOptag video\nFacebook\nInstagram"} />
      </Field>
      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input type="checkbox" checked={saveTemplate} onChange={(e) => setSaveTemplate(e.target.checked)} className="size-4 accent-[var(--primary)]" />
        Gem også som genbrugelig skabelon
      </label>
    </MarketingModal>
  );
}
