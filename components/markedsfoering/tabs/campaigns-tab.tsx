"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Megaphone, Trash2, Calendar, Pencil } from "lucide-react";
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
import {
  campaignStatuses,
  campaignStatusOrder,
  platforms,
  platformById,
  type CampaignStatus,
} from "@/features/marketing/constants";
import {
  createCampaign,
  updateCampaign,
  deleteCampaign,
} from "@/features/marketing/actions";
import type { Campaign } from "@/features/marketing/types";
import type { Task } from "@/features/tasks/types";

export function CampaignsTab({
  campaigns,
  tasks,
  autoCreate = false,
}: {
  campaigns: Campaign[];
  tasks: Task[];
  autoCreate?: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<Campaign | null>(null);
  const [open, setOpen] = React.useState(false);
  const opened = React.useRef(false);

  React.useEffect(() => {
    if (autoCreate && !opened.current) {
      opened.current = true;
      setEditing(null);
      setOpen(true);
    }
  }, [autoCreate]);

  function startNew() {
    setEditing(null);
    setOpen(true);
  }
  function startEdit(c: Campaign) {
    setEditing(c);
    setOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {campaigns.length} kampagne{campaigns.length === 1 ? "" : "r"}
        </p>
        <Button onClick={startNew} className="gap-1.5">
          <Plus className="size-4" /> Ny kampagne
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <EmptyState icon={Megaphone} text="Ingen kampagner endnu. Opret din første kampagne ovenfor." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {campaigns.map((c) => {
            const st = campaignStatuses[c.status as CampaignStatus] ?? campaignStatuses.planned;
            const taskCount = tasks.filter((t) => t.campaign_id === c.id).length;
            return (
              <Card key={c.id} interactive className="group flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold">{c.name}</h3>
                    <span className={cn("mt-0.5 inline-flex items-center gap-1.5 text-xs", st.tone)}>
                      <span className={cn("size-2 rounded-full", st.dot)} /> {st.label}
                    </span>
                  </div>
                  <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <IconBtn label="Rediger" onClick={() => startEdit(c)}><Pencil className="size-4" /></IconBtn>
                    <IconBtn
                      label="Slet"
                      danger
                      onClick={() => {
                        deleteCampaign(c.id).then(() => router.refresh());
                      }}
                    >
                      <Trash2 className="size-4" />
                    </IconBtn>
                  </div>
                </div>

                {c.description && (
                  <p className="line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
                )}

                <div className="flex flex-wrap gap-1.5">
                  {c.platforms.map((p) => {
                    const pl = platformById(p);
                    return (
                      <Badge key={p} variant="secondary">
                        {pl ? `${pl.emoji} ${pl.label}` : p}
                      </Badge>
                    );
                  })}
                </div>

                <div className="mt-auto flex items-center justify-between border-t border-border/50 pt-2.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3" />
                    {c.start_date ?? "—"}{c.end_date ? ` → ${c.end_date}` : ""}
                  </span>
                  <span>{taskCount} opgave{taskCount === 1 ? "" : "r"}</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <CampaignModal
        open={open}
        editing={editing}
        onClose={() => setOpen(false)}
        onSaved={() => {
          setOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}

function CampaignModal({
  open,
  editing,
  onClose,
  onSaved,
}: {
  open: boolean;
  editing: Campaign | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [status, setStatus] = React.useState<CampaignStatus>("planned");
  const [start, setStart] = React.useState("");
  const [end, setEnd] = React.useState("");
  const [plats, setPlats] = React.useState<string[]>([]);
  const [notes, setNotes] = React.useState("");
  const [pending, setPending] = React.useState(false);

  // Nulstil felterne når en ny kampagne åbnes/skiftes (state-mønster, ingen ref).
  const [seeded, setSeeded] = React.useState<string | null>(null);
  const want = open ? editing?.id ?? "new" : null;
  if (want !== seeded) {
    setSeeded(want);
    if (want) {
      setName(editing?.name ?? "");
      setDescription(editing?.description ?? "");
      setStatus((editing?.status as CampaignStatus) ?? "planned");
      setStart(editing?.start_date ?? "");
      setEnd(editing?.end_date ?? "");
      setPlats(editing?.platforms ?? []);
      setNotes(editing?.notes ?? "");
    }
  }

  function togglePlat(id: string) {
    setPlats((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  function save() {
    if (!name.trim()) {
      toast.error("Kampagnen mangler et navn.");
      return;
    }
    setPending(true);
    const values = {
      name: name.trim(),
      description: description.trim() || null,
      status,
      start_date: start || null,
      end_date: end || null,
      platforms: plats,
      notes: notes.trim() || null,
    };
    const run = editing
      ? updateCampaign(editing.id, values)
      : createCampaign({ name, description, status, start_date: start, end_date: end, platforms: plats, notes });
    run.then((res) => {
      setPending(false);
      if (res?.error) toast.error(res.error);
      else {
        toast.success(editing ? "Kampagne gemt ✓" : "Kampagne oprettet ✓");
        onSaved();
      }
    });
  }

  return (
    <MarketingModal
      open={open}
      title={editing ? "Rediger kampagne" : "Ny kampagne"}
      icon={<Megaphone className="size-4" />}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={pending}>Annullér</Button>
          <Button onClick={save} disabled={pending}>{pending ? "Gemmer …" : "Gem"}</Button>
        </>
      }
    >
      <Field label="Navn"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="fx Sommerkampagne 2026" /></Field>
      <Field label="Beskrivelse">
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={fieldArea} placeholder="Kort beskrivelse …" />
      </Field>
      <Field label="Status">
        <ChoiceGrid options={campaignStatusOrder.map((s) => ({ id: s, label: campaignStatuses[s].label }))} value={status} onChange={setStatus} columns={2} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Startdato"><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
        <Field label="Slutdato"><Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
      </div>
      <Field label="Platforme">
        <div className="flex flex-wrap gap-1.5">
          {platforms.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => togglePlat(p.id)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                plats.includes(p.id)
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border/60 bg-secondary/30 text-muted-foreground hover:bg-secondary",
              )}
            >
              {p.emoji} {p.label}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Noter">
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={fieldArea} placeholder="Interne noter …" />
      </Field>
    </MarketingModal>
  );
}

function IconBtn({
  children,
  label,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary",
        danger && "hover:bg-destructive/10 hover:text-destructive",
      )}
    >
      {children}
    </button>
  );
}
