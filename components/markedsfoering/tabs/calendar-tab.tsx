"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, CalendarDays, Trash2, Check } from "lucide-react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
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
import {
  eventTypes,
  eventTypeOrder,
  type MarketingEventType,
} from "@/features/marketing/constants";
import {
  createMarketingEvent,
  toggleEventDone,
  deleteMarketingEvent,
} from "@/features/marketing/actions";
import type { MarketingEvent, Campaign } from "@/features/marketing/types";

const todayKey = () => new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Copenhagen" });
function addDays(key: string, n: number) {
  const d = new Date(key + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString("en-CA");
}
function endOfMonth(key: string) {
  const d = new Date(key + "T00:00:00");
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toLocaleDateString("en-CA");
}
function prettyDate(key: string) {
  return new Date(key + "T00:00:00").toLocaleDateString("da-DK", { weekday: "short", day: "numeric", month: "short" });
}

export function CalendarTab({
  events,
  campaigns,
  autoCreate = false,
  presetType,
}: {
  events: MarketingEvent[];
  campaigns: Campaign[];
  autoCreate?: boolean;
  presetType?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const opened = React.useRef(false);
  React.useEffect(() => {
    if (autoCreate && !opened.current) {
      opened.current = true;
      setOpen(true);
    }
  }, [autoCreate]);

  const today = todayKey();
  const weekEnd = addDays(today, 7);
  const monthEnd = endOfMonth(today);

  const groups: { key: string; label: string; items: MarketingEvent[] }[] = [
    { key: "today", label: "I dag", items: [] },
    { key: "week", label: "Denne uge", items: [] },
    { key: "month", label: "Denne måned", items: [] },
    { key: "later", label: "Senere", items: [] },
  ];
  for (const e of [...events].sort((a, b) => a.event_date.localeCompare(b.event_date))) {
    const d = e.event_date.slice(0, 10);
    if (d === today) groups[0].items.push(e);
    else if (d > today && d <= weekEnd) groups[1].items.push(e);
    else if (d > weekEnd && d <= monthEnd) groups[2].items.push(e);
    else if (d > monthEnd) groups[3].items.push(e);
    else groups[0].items.push(e); // overskredet → vis under I dag
  }
  const nonEmpty = groups.filter((g) => g.items.length > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{events.length} planlagte begivenheder</p>
        <Button onClick={() => setOpen(true)} className="gap-1.5"><Plus className="size-4" /> Ny begivenhed</Button>
      </div>

      {events.length === 0 ? (
        <EmptyState icon={CalendarDays} text="Marketingkalenderen er tom. Planlæg fotoshoots, videooptagelser og opslag her." />
      ) : (
        <div className="space-y-5">
          {nonEmpty.map((g) => (
            <section key={g.key}>
              <h3 className="mb-2 text-sm font-semibold text-muted-foreground">{g.label}</h3>
              <Card className="divide-y divide-border/50 px-4 py-1">
                {g.items.map((e) => {
                  const t = eventTypes[e.type as MarketingEventType] ?? eventTypes.opslag;
                  return (
                    <div key={e.id} className="flex items-center gap-3 py-3">
                      <span
                        aria-hidden
                        className="flex size-9 shrink-0 items-center justify-center rounded-lg text-lg"
                        style={{ backgroundColor: `color-mix(in oklab, ${t.color} 16%, transparent)` }}
                      >
                        {t.emoji}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={cn("truncate font-medium", e.done && "text-muted-foreground line-through")}>{e.title}</p>
                        <p className="text-xs text-muted-foreground">{t.label} · {prettyDate(e.event_date.slice(0, 10))}</p>
                      </div>
                      <button
                        aria-label="Markér færdig"
                        onClick={() => toggleEventDone(e.id, !e.done).then(() => router.refresh())}
                        className={cn(
                          "flex size-7 items-center justify-center rounded-md border transition-colors",
                          e.done ? "border-success bg-success/15 text-success" : "border-border/60 text-muted-foreground hover:bg-secondary",
                        )}
                      >
                        <Check className="size-4" />
                      </button>
                      <button
                        aria-label="Slet"
                        onClick={() => deleteMarketingEvent(e.id).then(() => router.refresh())}
                        className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  );
                })}
              </Card>
            </section>
          ))}
        </div>
      )}

      <EventModal
        open={open}
        campaigns={campaigns}
        presetType={presetType}
        onClose={() => setOpen(false)}
        onSaved={() => { setOpen(false); router.refresh(); }}
      />
    </div>
  );
}

function EventModal({
  open,
  campaigns,
  presetType,
  onClose,
  onSaved,
}: {
  open: boolean;
  campaigns: Campaign[];
  presetType?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = React.useState("");
  const [type, setType] = React.useState<MarketingEventType>("opslag");
  const [date, setDate] = React.useState(todayKey());
  const [campaignId, setCampaignId] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [pending, setPending] = React.useState(false);

  const [seeded, setSeeded] = React.useState(false);
  if (open !== seeded) {
    setSeeded(open);
    if (open) {
      setTitle("");
      setType((presetType as MarketingEventType) ?? "opslag");
      setDate(todayKey());
      setCampaignId("");
      setNotes("");
    }
  }

  function save() {
    if (!title.trim()) { toast.error("Begivenheden mangler en titel."); return; }
    setPending(true);
    createMarketingEvent({
      title, type, event_date: date, campaign_id: campaignId || null, notes,
    }).then((res) => {
      setPending(false);
      if (res?.error) toast.error(res.error);
      else { toast.success("Føjet til kalenderen ✓"); onSaved(); }
    });
  }

  return (
    <MarketingModal
      open={open}
      title="Ny marketingbegivenhed"
      icon={<CalendarDays className="size-4" />}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={pending}>Annullér</Button>
          <Button onClick={save} disabled={pending}>{pending ? "Gemmer …" : "Opret"}</Button>
        </>
      }
    >
      <Field label="Titel"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="fx Reel: ny Audi Q5" autoFocus /></Field>
      <Field label="Type">
        <ChoiceGrid options={eventTypeOrder.map((t) => ({ id: t, label: eventTypes[t].label, emoji: eventTypes[t].emoji }))} value={type} onChange={setType} />
      </Field>
      <Field label="Dato"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <Field label="Kampagne (valgfri)">
        <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)} className={fieldInput}>
          <option value="">Ingen</option>
          {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <Field label="Noter">
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={fieldArea} placeholder="Detaljer …" />
      </Field>
    </MarketingModal>
  );
}
