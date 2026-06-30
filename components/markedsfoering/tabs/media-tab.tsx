"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, FolderOpen, Trash2, ExternalLink } from "lucide-react";
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
  fieldInput,
  fieldArea,
} from "@/components/markedsfoering/ui";
import { mediaTypes, mediaTypeOrder, type MediaType } from "@/features/marketing/constants";
import { createMedia, deleteMedia } from "@/features/marketing/actions";
import type { MediaItem, Campaign } from "@/features/marketing/types";

export function MediaTab({
  media,
  campaigns,
  autoCreate = false,
  presetType,
}: {
  media: MediaItem[];
  campaigns: Campaign[];
  autoCreate?: boolean;
  presetType?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [filter, setFilter] = React.useState<MediaType | "all">("all");
  const opened = React.useRef(false);
  React.useEffect(() => {
    if (autoCreate && !opened.current) { opened.current = true; setOpen(true); }
  }, [autoCreate]);

  const shown = media.filter((m) => filter === "all" || m.type === filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          <Chip active={filter === "all"} onClick={() => setFilter("all")}>Alle</Chip>
          {mediaTypeOrder.map((t) => (
            <Chip key={t} active={filter === t} onClick={() => setFilter(t)}>{mediaTypes[t].emoji} {mediaTypes[t].label}</Chip>
          ))}
        </div>
        <Button onClick={() => setOpen(true)} className="shrink-0 gap-1.5"><Plus className="size-4" /> Tilføj medie</Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Organisering og metadata. Tilføj et link (Drive, Dropbox, URL) – egentlig filhosting kan kobles på senere via en connector.
      </p>

      {shown.length === 0 ? (
        <EmptyState icon={FolderOpen} text="Ingen medier endnu. Hold styr på billeder, videoer, logoer, bannere og dokumenter her." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((m) => {
            const t = mediaTypes[m.type as MediaType] ?? mediaTypes.billede;
            return (
              <Card key={m.id} interactive className="group flex flex-col gap-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2 font-medium">
                    <span aria-hidden className="text-lg">{t.emoji}</span>
                    <span className="truncate">{m.title}</span>
                  </span>
                  <button aria-label="Slet" onClick={() => deleteMedia(m.id).then(() => router.refresh())} className="shrink-0 text-muted-foreground/60 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100">
                    <Trash2 className="size-4" />
                  </button>
                </div>
                {m.notes && <p className="line-clamp-2 text-sm text-muted-foreground">{m.notes}</p>}
                <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary">{t.label}</Badge>
                    {m.tags.slice(0, 2).map((tag) => <Badge key={tag} variant="outline">#{tag}</Badge>)}
                  </div>
                  {m.url && (
                    <a href={m.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
                      Åbn <ExternalLink className="size-3" />
                    </a>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <MediaModal open={open} campaigns={campaigns} presetType={presetType} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); router.refresh(); }} />
    </div>
  );
}

function MediaModal({
  open, campaigns, presetType, onClose, onSaved,
}: {
  open: boolean; campaigns: Campaign[]; presetType?: string; onClose: () => void; onSaved: () => void;
}) {
  const [title, setTitle] = React.useState("");
  const [type, setType] = React.useState<MediaType>("billede");
  const [url, setUrl] = React.useState("");
  const [tags, setTags] = React.useState("");
  const [campaignId, setCampaignId] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [seeded, setSeeded] = React.useState(false);
  if (open !== seeded) {
    setSeeded(open);
    if (open) {
      setTitle(""); setType((presetType as MediaType) ?? "billede"); setUrl(""); setTags(""); setCampaignId(""); setNotes("");
    }
  }

  function save() {
    if (!title.trim()) { toast.error("Mediet mangler en titel."); return; }
    setPending(true);
    createMedia({
      title, type, url, notes, campaign_id: campaignId || null,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
    }).then((res) => { setPending(false); if (res?.error) toast.error(res.error); else { toast.success("Medie tilføjet ✓"); onSaved(); } });
  }

  return (
    <MarketingModal open={open} title="Tilføj medie" icon={<FolderOpen className="size-4" />} onClose={onClose}
      footer={<><Button variant="outline" onClick={onClose} disabled={pending}>Annullér</Button><Button onClick={save} disabled={pending}>{pending ? "Gemmer …" : "Tilføj"}</Button></>}>
      <Field label="Titel"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="fx Logo – hvid version" autoFocus /></Field>
      <Field label="Type">
        <ChoiceGrid options={mediaTypeOrder.map((t) => ({ id: t, label: mediaTypes[t].label, emoji: mediaTypes[t].emoji }))} value={type} onChange={setType} />
      </Field>
      <Field label="Link (valgfri)"><Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" /></Field>
      <Field label="Tags (komma-adskilt)"><Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="fx logo, hvid, png" /></Field>
      <Field label="Kampagne (valgfri)">
        <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)} className={fieldInput}>
          <option value="">Ingen</option>
          {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <Field label="Noter"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={fieldArea} placeholder="Beskrivelse / hvor det bruges …" /></Field>
    </MarketingModal>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={cn("rounded-full border px-2.5 py-1 text-xs font-medium transition-colors", active ? "border-primary/40 bg-primary/10 text-primary" : "border-border/60 bg-secondary/30 text-muted-foreground hover:bg-secondary")}>{children}</button>
  );
}
