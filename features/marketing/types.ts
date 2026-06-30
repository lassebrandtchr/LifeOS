import type { CampaignStatus } from "@/features/marketing/constants";
import type { Task } from "@/features/tasks/types";

/** En marketingkampagne. */
export type Campaign = {
  id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  status: CampaignStatus;
  platforms: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
};

/** En idé i idébanken. */
export type MarketingIdea = {
  id: string;
  title: string;
  body: string | null;
  status: string;
  category: string | null;
  kind: string | null;
  tags: string[];
  favorite: boolean;
  created_at: string;
  updated_at: string;
};

/** En begivenhed i marketingkalenderen. */
export type MarketingEvent = {
  id: string;
  title: string;
  type: string;
  event_date: string;
  notes: string | null;
  platform: string | null;
  campaign_id: string | null;
  done: boolean;
  created_at: string;
  updated_at: string;
};

/** En wiki-side. */
export type WikiPage = {
  id: string;
  title: string;
  category: string;
  body: string | null;
  pinned: boolean;
  created_at: string;
  updated_at: string;
};

/** Et medie (organisering + metadata). */
export type MediaItem = {
  id: string;
  title: string;
  type: string;
  url: string | null;
  tags: string[];
  notes: string | null;
  campaign_id: string | null;
  created_at: string;
  updated_at: string;
};

/** Et punkt i en checkliste. */
export type ChecklistItem = { text: string; done: boolean };

/** En genbrugelig checkliste-skabelon. */
export type ChecklistTemplate = {
  id: string;
  name: string;
  items: string[];
  created_at: string;
  updated_at: string;
};

/** En checkliste-instans. */
export type Checklist = {
  id: string;
  name: string;
  template_id: string | null;
  campaign_id: string | null;
  items: ChecklistItem[];
  created_at: string;
  updated_at: string;
};

/** Afledte KPI'er (beregnes ud fra rigtige data – ingen manuel indtastning). */
export type MarketingKpis = {
  videos: number;
  postsPublished: number;
  activeCampaigns: number;
  ideas: number;
  tasksDone: number;
  tasksOpen: number;
};

/** Et punkt i marketing-indbakken (kontrolcenter). */
export type InboxItem = {
  id: string;
  kind: "campaign_soon" | "task_overdue" | "event_upcoming" | "task_today";
  title: string;
  detail: string;
  tone: "danger" | "warning" | "primary" | "neutral";
};

/** Hele datagrundlaget for Marketing Workspace (hentes parallelt på serveren). */
export type MarketingWorkspaceData = {
  campaigns: Campaign[];
  ideas: MarketingIdea[];
  events: MarketingEvent[];
  wiki: WikiPage[];
  media: MediaItem[];
  checklists: Checklist[];
  templates: ChecklistTemplate[];
  tasks: Task[];
  kpis: MarketingKpis;
  inbox: InboxItem[];
};
