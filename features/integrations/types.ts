/**
 * Connector-first arkitektur (Fase 9).
 *
 * Her bor de TYPEDE adaptere – det fælles sprog, resten af LifeOS taler, uanset
 * om en mail kom fra Gmail eller Outlook, eller et kalender-event fra Google
 * eller Outlook. Connector-laget oversætter den rå data fra hver udbyder til
 * disse former, så UI og AI aldrig behøver at kende den enkelte udbyder.
 *
 * VIGTIGT: i denne fase LÆSER vi kun. Ingen connector sender mails, sletter
 * events eller ændrer noget hos udbyderen.
 */

/** Datakategorier en connector kan levere. */
export type ConnectorKind = "mail" | "calendar" | "notion" | "files";

/**
 * Hvordan en connector kan hente data lige nu:
 *  - "sync":  kan hente RIGTIGE data ind allerede nu via de connector-værktøjer,
 *             assistenten har i samtalen (ingen app-OAuth/nøgler nødvendige).
 *  - "oauth": kræver en permanent app-forbindelse (OAuth) – bygges i en senere
 *             fase. Indtil da vises den som "Kommer snart".
 */
export type ConnectorAvailability = "sync" | "oauth";

/** Forbindelsens tilstand for en bruger (gemmes i `integrations`-tabellen). */
export type ConnectorStatus =
  | "disconnected" // ikke forbundet endnu
  | "connected" // forbundet og klar
  | "syncing" // henter data lige nu
  | "error"; // noget gik galt ved seneste synk

/** En connector i registret (statisk definition – ikke bruger-specifik). */
export type ConnectorDefinition = {
  id: string; // matcher integrations.connector_id, fx 'gmail'
  name: string; // visningsnavn, fx 'Gmail'
  provider: string; // udbyder, fx 'Google'
  kind: ConnectorKind;
  emoji: string; // fallback hvis logoet ikke kan vises
  /** Sti til det ægte brand-logo (SVG i /public/connectors). */
  iconSrc: string;
  /** Kort dansk forklaring til Integration Center. */
  description: string;
  availability: ConnectorAvailability;
  /** true = endnu ikke klar at forbinde (fx Outlook – tages senere). */
  comingSoon: boolean;
  /** Sat hvis connectoren forbindes app-side (OAuth eller Notion-token). */
  oauth?: "google" | "microsoft" | "notion";
};

/** En brugers tilstand for én connector (læst fra `integrations`). */
export type ConnectorState = {
  connectorId: string;
  enabled: boolean;
  status: ConnectorStatus;
  lastSyncedAt: string | null;
};

// =====================================================================
//  Adaptere – det fælles dataformat på tværs af udbydere.
// =====================================================================

/** En mail, normaliseret fra Gmail/Outlook. */
export type MailMessage = {
  id: string;
  externalId: string | null;
  subject: string;
  snippet: string;
  from: string;
  isRead: boolean;
  /** Har Lasse svaret på mailen? (styrer "Besvaret"-badgen) */
  replied: boolean;
  /** Grov kategori sat af Mail AI (fx 'kunde', 'faktura') – kan være null. */
  category: string | null;
  /** Hvilken connector den kom fra ('gmail', 'outlook', ...). */
  source: string | null;
  /** 'work' | 'private' | 'shared' (samme verdener som resten af LifeOS). */
  workspace: string;
  receivedAt: string | null;
};

/** Et kalender-event, normaliseret fra Google/Outlook Calendar. */
export type CalendarEventItem = {
  id: string;
  externalId: string | null;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string | null;
  endsAt: string | null;
  allDay: boolean;
  source: string | null;
  /** 'work' | 'private' | 'shared'. */
  workspace: string;
};

/** Et Notion-emne (side/database-række), normaliseret fra Notion. */
export type NotionItem = {
  id: string;
  externalId: string | null;
  title: string;
  type: string | null;
  url: string | null;
  snippet: string | null;
  editedAt: string | null;
};
