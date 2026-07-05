"use client";

import * as React from "react";
import { RefreshCw, Lightbulb, Check, Film, Megaphone, MessageSquare } from "lucide-react";
import { toast } from "sonner";

import { SectionCard } from "@/components/dashboard/section-card";
import { createIdea } from "@/features/marketing/actions";
import { weeklyIdeas, type ContentIdea } from "@/features/marketing/idea-generator";

const KIND_META: Record<ContentIdea["kind"], { label: string; icon: typeof Film; color: string }> = {
  video: { label: "Video", icon: Film, color: "#e5484d" },
  opslag: { label: "Opslag", icon: MessageSquare, color: "#4f8dff" },
  kampagne: { label: "Kampagne", icon: Megaphone, color: "#a78bfa" },
};

/**
 * IdeaSpark – "Ugens content-idéer" på Marketing-dashboardet.
 * Konkrete, sæsonbevidste idéer til opslag/video/kampagner for Storgaard
 * Biler. Roterer automatisk hver uge; "Nye idéer" blander videre; ét klik
 * gemmer idéen direkte i Idébanken (og fjerner den fra listen).
 */
export function IdeaSpark() {
  const [shuffle, setShuffle] = React.useState(0);
  const [saved, setSaved] = React.useState<Set<string>>(new Set());
  const [savingTitle, setSavingTitle] = React.useState<string | null>(null);

  const ideas = React.useMemo(() => weeklyIdeas(3, shuffle), [shuffle]);

  async function save(idea: ContentIdea) {
    if (savingTitle) return;
    setSavingTitle(idea.title);
    const res = await createIdea({ title: idea.title, body: idea.body, kind: idea.kind });
    setSavingTitle(null);
    if (res?.error) toast.error(res.error);
    else {
      setSaved((s) => new Set(s).add(idea.title));
      toast.success("Gemt i Idébanken ✓");
    }
  }

  return (
    <SectionCard title="Ugens content-idéer" icon={Lightbulb}>
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={() => setShuffle((n) => n + 1)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-secondary/40 px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-secondary"
        >
          <RefreshCw className="size-3.5" />
          Nye idéer
        </button>
      </div>
      <ul className="space-y-2.5">
        {ideas.map((idea) => {
          const meta = KIND_META[idea.kind];
          const isSaved = saved.has(idea.title);
          return (
            <li
              key={idea.title}
              className="rounded-xl border border-border/50 bg-secondary/20 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                      style={{
                        color: meta.color,
                        borderColor: `color-mix(in oklab, ${meta.color} 40%, transparent)`,
                        backgroundColor: `color-mix(in oklab, ${meta.color} 10%, transparent)`,
                      }}
                    >
                      <meta.icon className="size-3" />
                      {meta.label}
                    </span>
                    <p className="truncate text-sm font-semibold">{idea.title}</p>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {idea.body}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => save(idea)}
                  disabled={isSaved || savingTitle === idea.title}
                  className="shrink-0 rounded-lg border border-border/60 bg-background px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-secondary disabled:opacity-60"
                >
                  {isSaved ? (
                    <span className="inline-flex items-center gap-1 text-success">
                      <Check className="size-3.5" /> Gemt
                    </span>
                  ) : savingTitle === idea.title ? (
                    "Gemmer…"
                  ) : (
                    "Gem i Idébank"
                  )}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">
        Idéerne skifter automatisk hver uge og følger sæsonen.
      </p>
    </SectionCard>
  );
}
