/**
 * Faste taksonomier for opgavesystemet (Fase 6).
 * Værdierne (id'er) gemmes i databasen og er engelske; etiketterne er danske.
 * Samlet ét sted, så der ikke er hardcodede strenge spredt i UI'et.
 */

// ───────────────────────────── Prioriteter ──────────────────────────────
export type Priority = "urgent" | "important" | "can_wait" | "low";

export const priorities: Record<
  Priority,
  { label: string; emoji: string; dot: string; text: string }
> = {
  urgent: { label: "Haster", emoji: "🔴", dot: "bg-destructive", text: "text-destructive" },
  important: { label: "Vigtigt", emoji: "🟠", dot: "bg-warning", text: "text-warning" },
  can_wait: { label: "Kan vente", emoji: "🟡", dot: "bg-yellow-400", text: "text-yellow-500" },
  low: { label: "Lav prioritet", emoji: "🟢", dot: "bg-success", text: "text-success" },
};

export const priorityOrder: Priority[] = ["urgent", "important", "can_wait", "low"];

// ─────────────────────────────── Statusser ──────────────────────────────
export type Status =
  | "not_started"
  | "in_progress"
  | "waiting"
  | "done"
  | "archived";

export const statuses: Record<Status, { label: string }> = {
  not_started: { label: "Ikke startet" },
  in_progress: { label: "I gang" },
  waiting: { label: "Afventer" },
  done: { label: "Færdig" },
  archived: { label: "Arkiveret" },
};

export const statusOrder: Status[] = [
  "not_started",
  "in_progress",
  "waiting",
  "done",
  "archived",
];

// ──────────────────────────────── Buckets ───────────────────────────────
// Hvornår opgaven skal løses – styrer drag-and-drop-kolonnerne.
export type Bucket = "today" | "week" | "later";

export const buckets: Record<Bucket, { label: string }> = {
  today: { label: "I dag" },
  week: { label: "Denne uge" },
  later: { label: "Senere" },
};

export const bucketOrder: Bucket[] = ["today", "week", "later"];

// ─────────────────────────── Verden (workspace) ─────────────────────────
export type Workspace = "private" | "work";

export const workspaces: Record<Workspace, { label: string }> = {
  private: { label: "Privat" },
  work: { label: "Storgaard Biler" },
};

// ─────────────────────────────── Kategorier ─────────────────────────────
export type Category = {
  id: string;
  label: string;
  emoji: string;
  workspace: Workspace;
};

export const categories: Category[] = [
  // Privat
  { id: "tangevej_94", label: "Tangevej 94", emoji: "🏠", workspace: "private" },
  { id: "familie", label: "Familie", emoji: "👨‍👩‍👧", workspace: "private" },
  { id: "oekonomi", label: "Økonomi", emoji: "💰", workspace: "private" },
  { id: "indkoeb", label: "Indkøb", emoji: "🛒", workspace: "private" },
  { id: "ferie", label: "Ferie", emoji: "✈️", workspace: "private" },
  { id: "personligt", label: "Personligt", emoji: "📝", workspace: "private" },
  // Arbejde
  { id: "kundeopfoelgning", label: "Kundeopfølgning", emoji: "🚗", workspace: "work" },
  { id: "mail", label: "Mail", emoji: "📬", workspace: "work" },
  { id: "markedsfoering", label: "Markedsføring", emoji: "🎬", workspace: "work" },
  { id: "sociale_medier", label: "Sociale medier", emoji: "📸", workspace: "work" },
  { id: "salg", label: "Salg", emoji: "📈", workspace: "work" },
  { id: "finansiering", label: "Finansiering", emoji: "💳", workspace: "work" },
  { id: "administration", label: "Administration", emoji: "📋", workspace: "work" },
];

export const categoryById = (id: string | null | undefined) =>
  categories.find((c) => c.id === id);
