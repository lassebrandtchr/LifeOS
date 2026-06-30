import type { ConnectorDefinition, ConnectorKind } from "@/features/integrations/types";

/**
 * Register over LifeOS' connectors (Fase 9).
 *
 * Dette er den ENE kilde til sandhed for, hvilke integrationer der findes,
 * hvad de hedder, hvilken slags data de leverer, og om de kan forbindes nu.
 *
 *  - availability "sync"  → kan hente RIGTIGE data ind nu (via assistentens
 *                           connector-værktøjer i samtalen – ingen nøgler).
 *  - availability "oauth" → kræver permanent app-forbindelse (senere fase).
 *  - comingSoon true      → vises men kan ikke forbindes endnu (fx Outlook).
 *
 * Hver connector kan tændes/slukkes individuelt i Integration Center.
 */

export const connectors: ConnectorDefinition[] = [
  // ---------------- Mail ----------------
  {
    id: "gmail",
    name: "Gmail",
    provider: "Google",
    kind: "mail",
    emoji: "📬",
    iconSrc: "/connectors/gmail.svg",
    description: "Dine Gmail-mails hentes ind, så Mail AI kan prioritere og foreslå opfølgning.",
    availability: "oauth",
    comingSoon: false,
    oauth: "google",
  },
  {
    id: "outlook_mail",
    name: "Outlook Mail",
    provider: "Microsoft",
    kind: "mail",
    emoji: "📧",
    iconSrc: "/connectors/outlook_mail.svg",
    description: "Storgaard-mails fra Outlook/Microsoft 365. Forbindes permanent og synkroniseres automatisk hver 30. min.",
    availability: "oauth",
    comingSoon: false,
    oauth: "microsoft",
  },

  // ---------------- Kalender ----------------
  {
    id: "google_calendar",
    name: "Google Kalender",
    provider: "Google",
    kind: "calendar",
    emoji: "📅",
    iconSrc: "/connectors/google_calendar.svg",
    description: "Aftaler og begivenheder fra Google Kalender, så Calendar AI kan planlægge med dig.",
    availability: "oauth",
    comingSoon: false,
    oauth: "google",
  },
  {
    id: "outlook_calendar",
    name: "Outlook Kalender",
    provider: "Microsoft",
    kind: "calendar",
    emoji: "🗓️",
    iconSrc: "/connectors/outlook_calendar.svg",
    description: "Storgaard-kalenderen fra Outlook/Microsoft 365. Forbindes permanent og synkroniseres automatisk hver 30. min.",
    availability: "oauth",
    comingSoon: false,
    oauth: "microsoft",
  },

  // ---------------- Noter / viden ----------------
  {
    id: "notion",
    name: "Notion",
    provider: "Notion",
    kind: "notion",
    emoji: "🗒️",
    iconSrc: "/connectors/notion.svg",
    description: "Sider og databaser fra Notion samles i dit second brain og bliver søgbare.",
    availability: "oauth",
    comingSoon: false,
    oauth: "notion",
  },

  // ---------------- Filer ----------------
  {
    id: "google_drive",
    name: "Google Drive",
    provider: "Google",
    kind: "files",
    emoji: "📁",
    iconSrc: "/connectors/google_drive.svg",
    description: "Dokumenter og filer fra Drive. Forbindelse bygges i en senere fase.",
    availability: "oauth",
    comingSoon: true,
  },
];

export const connectorById = (id: string) =>
  connectors.find((c) => c.id === id);

/** Connectors grupperet pr. datakategori – til visningen i Integration Center. */
export type ConnectorGroup = {
  kind: ConnectorKind;
  label: string;
  emoji: string;
  connectors: ConnectorDefinition[];
};

const GROUP_META: Record<ConnectorKind, { label: string; emoji: string }> = {
  mail: { label: "Mail", emoji: "📬" },
  calendar: { label: "Kalender", emoji: "📅" },
  notion: { label: "Noter & viden", emoji: "🗒️" },
  files: { label: "Filer", emoji: "📁" },
};

const GROUP_ORDER: ConnectorKind[] = ["mail", "calendar", "notion", "files"];

export const connectorGroups: ConnectorGroup[] = GROUP_ORDER.map((kind) => ({
  kind,
  label: GROUP_META[kind].label,
  emoji: GROUP_META[kind].emoji,
  connectors: connectors.filter((c) => c.kind === kind),
})).filter((g) => g.connectors.length > 0);
