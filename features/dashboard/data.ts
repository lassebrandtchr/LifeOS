import {
  Plus,
  NotebookPen,
  CalendarPlus,
  Car,
  Home,
  type LucideIcon,
} from "lucide-react";

/**
 * Placeholder-data til Jarvis Dashboard (Fase 5).
 *
 * ALT data her er midlertidigt og samlet ét sted, så der ikke er hardcodede
 * værdier spredt rundt i komponenterne. Når integrationer og AI bygges i
 * senere faser, erstattes denne fil af rigtige data fra Supabase/API'er.
 */

export type Tone = "neutral" | "primary" | "warning" | "success" | "danger";

export type StatItem = {
  label: string;
  value: string;
  tone?: Tone;
};

// ───────────────────────────── Hero / fokus ─────────────────────────────
export const heroFocus =
  "Følg op på 3 varme leads, og besvar 2 vigtige mails inden frokost.";

// ──────────────────────────── Dagens fokus ──────────────────────────────
export const focusTasks: { title: string; tone: Tone }[] = [
  { title: "Ring til kunde om finansiering af Audi A4", tone: "danger" },
  { title: "Send tilbud på leasing til erhvervskunde", tone: "warning" },
  { title: "Godkend ugens markedsføringsopslag", tone: "neutral" },
];

export const focusHighlights: StatItem[] = [
  { label: "Næste aftale", value: "11:00 · Prøvekørsel", tone: "primary" },
  { label: "Ubesvarede mails", value: "7", tone: "warning" },
  { label: "Kundeopfølgninger i dag", value: "3", tone: "danger" },
];

// ─────────────────────────────── Kalender ───────────────────────────────
export const calendarData: StatItem[] = [
  { label: "I dag", value: "4 aftaler", tone: "primary" },
  { label: "Næste møde", value: "11:00 · Prøvekørsel" },
  { label: "Denne uge", value: "12 aftaler" },
  { label: "Kommende", value: "Værkstedsbesøg i morgen" },
];

// ──────────────────────────────── Mail ──────────────────────────────────
export const mailData: { scope: string; total: string; flagged: StatItem }[] = [
  {
    scope: "Arbejde",
    total: "18 mails",
    flagged: { label: "Kræver svar", value: "5", tone: "warning" },
  },
  {
    scope: "Privat",
    total: "6 mails",
    flagged: { label: "Vigtige", value: "2", tone: "primary" },
  },
];

// ──────────────────────────────── Opgaver ───────────────────────────────
export const tasksData: StatItem[] = [
  { label: "I dag", value: "5", tone: "primary" },
  { label: "Denne uge", value: "11" },
  { label: "Haster", value: "2", tone: "danger" },
  { label: "Kan vente", value: "4", tone: "neutral" },
];

// ───────────────────────────── Storgaard Biler ──────────────────────────
export const storgaardData: StatItem[] = [
  { label: "Kundeopfølgninger", value: "3", tone: "danger" },
  { label: "Aktive leads", value: "9", tone: "primary" },
  { label: "Markedsføring", value: "2 opslag klar" },
  { label: "Lagerbiler", value: "24 på lager" },
];

// ───────────────────────────── Tangevej 94 ──────────────────────────────
export const tangevejData: StatItem[] = [
  { label: "Projekter", value: "2 i gang", tone: "primary" },
  { label: "Hus", value: "Service af varmepumpe" },
  { label: "Familie", value: "Fødselsdag på lørdag" },
  { label: "Opgaver", value: "3 åbne" },
];

// ─────────────────────────────── AI-noter ───────────────────────────────
export const aiNotes: { text: string; kind: "idé" | "påmindelse" | "forslag" }[] =
  [
    { kind: "forslag", text: "Tilbyd vinterdæk-pakke til leads, der kigger på SUV'er." },
    { kind: "påmindelse", text: "Du har ikke fulgt op på Mette i 6 dage." },
    { kind: "idé", text: "Lav en kort video af den nye Tesla på lageret." },
  ];

// ────────────────────────────── Dagens status ───────────────────────────
export const dailyStatus: { label: string; value: string; emoji: string }[] = [
  { emoji: "✅", label: "Opgaver færdiggjort", value: "3 / 8" },
  { emoji: "📬", label: "Mails besvaret", value: "11" },
  { emoji: "🚗", label: "Kundeopfølgninger", value: "1 / 3" },
  { emoji: "🏠", label: "Private opgaver", value: "1 / 4" },
];

// ──────────────────────────── Hurtige handlinger ────────────────────────
// href peger på den side, handlingen hører til (opgaver virker fuldt; resten
// åbner den relevante sektion, som udbygges i senere faser).
export const quickActions: {
  label: string;
  icon: LucideIcon;
  emoji: string;
  href: string;
  color: string;
}[] = [
  { label: "Ny opgave", icon: Plus, emoji: "➕", href: "/opgaver", color: "#4f8dff" },
  { label: "Ny note", icon: NotebookPen, emoji: "📝", href: "/opgaver", color: "#a78bfa" },
  { label: "Ny aftale", icon: CalendarPlus, emoji: "📅", href: "/kalender", color: "#34b3a4" },
  { label: "Ny kunde", icon: Car, emoji: "🚗", href: "/storgaard-biler", color: "#e6b15a" },
  { label: "Nyt projekt", icon: Home, emoji: "🏠", href: "/opgaver", color: "#f472b6" },
];

// ─────────────────────── Chat med LifeOS – fokus-områder ─────────────────
export const chatScopes = [
  "Automatisk",
  "Privat",
  "Arbejde",
  "Mail",
  "Kalender",
  "Markedsføring",
  "Tangevej 94",
] as const;

export type ChatScope = (typeof chatScopes)[number];

/**
 * AI-assistenter (FASE 5: kun struktur – ingen intelligens endnu).
 * Listen gør komponenterne klar til de agenter, der bygges i en senere fase.
 */
export const aiAgents = [
  { id: "chief-of-staff", name: "Chief of Staff" },
  { id: "mail", name: "Mail AI" },
  { id: "calendar", name: "Calendar AI" },
  { id: "home", name: "Home AI" },
  { id: "sales", name: "Sales AI" },
  { id: "marketing", name: "Marketing AI" },
  { id: "memory", name: "Memory AI" },
] as const;
