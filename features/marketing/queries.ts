import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getMarketingTasks } from "@/features/tasks/queries";
import type { Task } from "@/features/tasks/types";
import type {
  Campaign,
  MarketingIdea,
  MarketingEvent,
  WikiPage,
  MediaItem,
  Checklist,
  ChecklistItem,
  ChecklistTemplate,
  MarketingKpis,
  InboxItem,
  MarketingWorkspaceData,
} from "@/features/marketing/types";

/**
 * Læselag for Marketing Workspace.
 *
 * Robust efter samme princip som resten af LifeOS: hvis Supabase ikke er sat op,
 * eller migration 0009 ikke er kørt endnu, returneres tomme lister i stedet for
 * at få siden til at crashe. RLS sikrer, at man kun ser sine egne data.
 */

async function rows<T>(table: string, order: string, asc = false): Promise<T[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .order(order, { ascending: asc });
    if (error || !data) return [];
    return data as T[];
  } catch {
    return [];
  }
}

export const getCampaigns = () => rows<Campaign>("marketing_campaigns", "created_at");
export const getMarketingIdeas = () => rows<MarketingIdea>("marketing_ideas", "created_at");
export const getMarketingEvents = () => rows<MarketingEvent>("marketing_events", "event_date", true);
export const getWikiPages = () => rows<WikiPage>("marketing_wiki", "updated_at");
export const getMedia = () => rows<MediaItem>("marketing_media", "created_at");
export const getChecklistTemplates = () =>
  rows<ChecklistTemplate>("marketing_checklist_templates", "created_at");

/** Checklister – normaliserer items-jsonb til ChecklistItem[]. */
async function getChecklists(): Promise<Checklist[]> {
  const raw = await rows<Record<string, unknown>>("marketing_checklists", "created_at");
  return raw.map((r) => ({
    id: r.id as string,
    name: (r.name as string) ?? "",
    template_id: (r.template_id as string | null) ?? null,
    campaign_id: (r.campaign_id as string | null) ?? null,
    items: Array.isArray(r.items) ? (r.items as ChecklistItem[]) : [],
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  }));
}

const todayKey = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Copenhagen" });

function dateKey(value: string | null): string {
  if (!value) return "";
  return value.length >= 10 ? value.slice(0, 10) : value;
}

function addDays(key: string, days: number): string {
  const d = new Date(key + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-CA");
}

/** Udleder KPI'er ud fra de rigtige data (ingen manuel indtastning). */
function deriveKpis(
  campaigns: Campaign[],
  ideas: MarketingIdea[],
  events: MarketingEvent[],
  media: MediaItem[],
  tasks: Task[],
): MarketingKpis {
  const done = tasks.filter((t) => t.status === "done").length;
  const open = tasks.filter((t) => t.status !== "done" && t.status !== "archived").length;
  const videos =
    media.filter((m) => m.type === "video").length +
    events.filter((e) => e.type === "video" && e.done).length;
  const postsPublished = events.filter(
    (e) => e.done && e.type !== "fotoshoot" && e.type !== "video",
  ).length;
  return {
    videos,
    postsPublished,
    activeCampaigns: campaigns.filter((c) => c.status === "active").length,
    ideas: ideas.length,
    tasksDone: done,
    tasksOpen: open,
  };
}

/** Bygger marketing-indbakken (kontrolcenter) ud fra de rigtige data. */
function deriveInbox(
  campaigns: Campaign[],
  events: MarketingEvent[],
  tasks: Task[],
): InboxItem[] {
  const today = todayKey();
  const weekAhead = addDays(today, 7);
  const items: InboxItem[] = [];

  for (const t of tasks) {
    if (t.status === "done" || t.status === "archived") continue;
    const dl = dateKey(t.deadline);
    if (dl && dl < today) {
      items.push({
        id: `task-${t.id}`,
        kind: "task_overdue",
        title: t.title,
        detail: "Forfalden marketingopgave",
        tone: "danger",
      });
    } else if (t.bucket === "today" || (dl && dl === today)) {
      items.push({
        id: `task-today-${t.id}`,
        kind: "task_today",
        title: t.title,
        detail: "Marketingopgave i dag",
        tone: "warning",
      });
    }
  }

  for (const c of campaigns) {
    const start = dateKey(c.start_date);
    if (c.status === "planned" && start && start >= today && start <= weekAhead) {
      items.push({
        id: `camp-${c.id}`,
        kind: "campaign_soon",
        title: c.name,
        detail: `Kampagne starter ${start}`,
        tone: "primary",
      });
    }
  }

  for (const e of events) {
    const d = dateKey(e.event_date);
    if (!e.done && d >= today && d <= weekAhead) {
      items.push({
        id: `event-${e.id}`,
        kind: "event_upcoming",
        title: e.title,
        detail: `Planlagt ${d}`,
        tone: "neutral",
      });
    }
  }

  // Forfaldne/hastende først.
  const toneRank: Record<InboxItem["tone"], number> = {
    danger: 0,
    warning: 1,
    primary: 2,
    neutral: 3,
  };
  return items.sort((a, b) => toneRank[a.tone] - toneRank[b.tone]).slice(0, 12);
}

/** Henter HELE Marketing Workspace i ét kald (parallelt). */
export async function getMarketingWorkspaceData(): Promise<MarketingWorkspaceData> {
  const [campaigns, ideas, events, wiki, media, checklists, templates, tasks] =
    await Promise.all([
      getCampaigns(),
      getMarketingIdeas(),
      getMarketingEvents(),
      getWikiPages(),
      getMedia(),
      getChecklists(),
      getChecklistTemplates(),
      getMarketingTasks(),
    ]);

  return {
    campaigns,
    ideas,
    events,
    wiki,
    media,
    checklists,
    templates,
    tasks,
    kpis: deriveKpis(campaigns, ideas, events, media, tasks),
    inbox: deriveInbox(campaigns, events, tasks),
  };
}
