/**
 * Faste taksonomier for Marketing Workspace (Fase 10).
 * Værdier (id'er) gemmes i databasen og er engelske; etiketter er danske.
 * Samlet ét sted, så der ikke er hardcodede strenge spredt i UI'et.
 * REGELBASERET – ingen AI.
 */

// ─────────────────────────── Kampagne-status ────────────────────────
export type CampaignStatus = "planned" | "active" | "paused" | "done";

export const campaignStatuses: Record<
  CampaignStatus,
  { label: string; tone: string; dot: string }
> = {
  planned: { label: "Planlægges", tone: "text-muted-foreground", dot: "bg-muted-foreground" },
  active: { label: "Aktiv", tone: "text-success", dot: "bg-success" },
  paused: { label: "Pause", tone: "text-warning", dot: "bg-warning" },
  done: { label: "Afsluttet", tone: "text-primary", dot: "bg-primary" },
};

export const campaignStatusOrder: CampaignStatus[] = ["planned", "active", "paused", "done"];

// ──────────────────────────────── Platforme ─────────────────────────
export type Platform = {
  id: string;
  label: string;
  emoji: string;
  color: string;
};

export const platforms: Platform[] = [
  { id: "facebook", label: "Facebook", emoji: "📘", color: "#4f8dff" },
  { id: "instagram", label: "Instagram", emoji: "📸", color: "#e1306c" },
  { id: "tiktok", label: "TikTok", emoji: "🎬", color: "#111827" },
  { id: "youtube", label: "YouTube", emoji: "▶️", color: "#e5484d" },
  { id: "nyhedsbrev", label: "Nyhedsbrev", emoji: "📧", color: "#34b3a4" },
  { id: "google", label: "Google Business", emoji: "🌐", color: "#e6b15a" },
  { id: "website", label: "Website", emoji: "🖥️", color: "#a78bfa" },
];

export const platformById = (id: string) => platforms.find((p) => p.id === id);

// ─────────────────────── Marketingkalender-typer ────────────────────
export type MarketingEventType =
  | "fotoshoot"
  | "video"
  | "facebook"
  | "instagram"
  | "tiktok"
  | "nyhedsbrev"
  | "kampagne"
  | "tilbud"
  | "opslag";

export const eventTypes: Record<MarketingEventType, { label: string; emoji: string; color: string }> = {
  fotoshoot: { label: "Fotoshoot", emoji: "📸", color: "#e1306c" },
  video: { label: "Videooptagelse", emoji: "🎥", color: "#e5484d" },
  facebook: { label: "Facebook", emoji: "📘", color: "#4f8dff" },
  instagram: { label: "Instagram", emoji: "📸", color: "#e1306c" },
  tiktok: { label: "TikTok", emoji: "🎬", color: "#111827" },
  nyhedsbrev: { label: "Nyhedsbrev", emoji: "📧", color: "#34b3a4" },
  kampagne: { label: "Kampagne", emoji: "🎉", color: "#a78bfa" },
  tilbud: { label: "Tilbud", emoji: "🛒", color: "#e6b15a" },
  opslag: { label: "Opslag", emoji: "📱", color: "#4f8dff" },
};

export const eventTypeOrder: MarketingEventType[] = [
  "fotoshoot", "video", "facebook", "instagram", "tiktok", "nyhedsbrev", "kampagne", "tilbud", "opslag",
];

// ─────────────────────────── Idébank-kategorier ─────────────────────
export type IdeaKind =
  | "video"
  | "reel"
  | "tiktok"
  | "facebook"
  | "kampagne"
  | "branding"
  | "bil";

export const ideaKinds: Record<IdeaKind, { label: string; emoji: string }> = {
  video: { label: "Video", emoji: "🎥" },
  reel: { label: "Reel", emoji: "🎞️" },
  tiktok: { label: "TikTok", emoji: "🎬" },
  facebook: { label: "Facebook", emoji: "📘" },
  kampagne: { label: "Kampagne", emoji: "🎉" },
  branding: { label: "Branding", emoji: "🏢" },
  bil: { label: "Bilcontent", emoji: "🚗" },
};

export const ideaKindOrder: IdeaKind[] = [
  "bil", "video", "reel", "tiktok", "facebook", "kampagne", "branding",
];

// ──────────────────────────── Wiki-kategorier ───────────────────────
export type WikiCategory =
  | "brand"
  | "logoer"
  | "farver"
  | "fonte"
  | "arbejdsgange"
  | "skabeloner"
  | "checklister"
  | "manualer";

export const wikiCategories: Record<WikiCategory, { label: string; emoji: string }> = {
  brand: { label: "Brand guidelines", emoji: "✨" },
  logoer: { label: "Logoer", emoji: "🅰️" },
  farver: { label: "Farver", emoji: "🎨" },
  fonte: { label: "Fonte", emoji: "🔤" },
  arbejdsgange: { label: "Arbejdsgange", emoji: "🔁" },
  skabeloner: { label: "Skabeloner", emoji: "📄" },
  checklister: { label: "Checklister", emoji: "✅" },
  manualer: { label: "Manualer", emoji: "📚" },
};

export const wikiCategoryOrder: WikiCategory[] = [
  "brand", "logoer", "farver", "fonte", "arbejdsgange", "skabeloner", "checklister", "manualer",
];

// ───────────────────────────── Medie-typer ──────────────────────────
export type MediaType = "billede" | "video" | "logo" | "banner" | "dokument";

export const mediaTypes: Record<MediaType, { label: string; emoji: string }> = {
  billede: { label: "Billede", emoji: "🖼️" },
  video: { label: "Video", emoji: "🎥" },
  logo: { label: "Logo", emoji: "🅰️" },
  banner: { label: "Banner", emoji: "🏷️" },
  dokument: { label: "Dokument", emoji: "📄" },
};

export const mediaTypeOrder: MediaType[] = ["billede", "video", "logo", "banner", "dokument"];

// ──────────────── Starter-checklister (kan genbruges) ────────────────
// Indbyggede skabeloner Lasse kan tage i brug med ét klik. Han kan også
// gemme sine egne i databasen.
export const starterChecklists: { name: string; items: string[] }[] = [
  {
    name: "Ny bil",
    items: [
      "Tag billeder",
      "Optag video",
      "Opret annonce",
      "Facebook",
      "Instagram",
      "TikTok",
      "Leasingopslag",
      "Website",
    ],
  },
  {
    name: "Ny kampagne",
    items: [
      "Banner",
      "Landingpage",
      "Facebook",
      "Instagram",
      "Nyhedsbrev",
      "Google Business",
      "Website",
    ],
  },
];
