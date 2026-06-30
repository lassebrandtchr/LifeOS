import "server-only";

/**
 * Microsoft Graph API – tynd wrapper (kun det LifeOS bruger: Outlook-mail +
 * Outlook-kalender, kun læsning). Alle kald bruger et gyldigt access_token
 * (hentes via features/integrations/microsoft.ts).
 */

const GRAPH = "https://graph.microsoft.com/v1.0";

export type OutlookMessage = {
  id: string;
  subject: string;
  snippet: string;
  from: string | null;
  isRead: boolean;
  receivedISO: string | null;
};

/** Henter de seneste mails fra Outlook-indbakken. */
export async function listOutlookMessages(
  accessToken: string,
  top = 30,
): Promise<OutlookMessage[]> {
  const params = new URLSearchParams({
    $top: String(top),
    $select: "subject,bodyPreview,from,isRead,receivedDateTime",
    $orderby: "receivedDateTime desc",
  });
  try {
    const res = await fetch(
      `${GRAPH}/me/mailFolders/inbox/messages?${params.toString()}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!res.ok) return [];
    const data = await res.json();
    const items = (data.value ?? []) as Record<string, unknown>[];
    return items.map((m) => {
      const from = m.from as
        | { emailAddress?: { address?: string; name?: string } }
        | undefined;
      const addr = from?.emailAddress;
      return {
        id: m.id as string,
        subject: (m.subject as string) ?? "(uden emne)",
        snippet: (m.bodyPreview as string) ?? "",
        from: addr?.name ?? addr?.address ?? null,
        isRead: Boolean(m.isRead),
        receivedISO: (m.receivedDateTime as string) ?? null,
      };
    });
  } catch {
    return [];
  }
}

export type OutlookEvent = {
  id: string;
  subject: string;
  description: string | null;
  location: string | null;
  startISO: string | null;
  endISO: string | null;
  allDay: boolean;
};

/**
 * Henter begivenheder fra Outlook-kalenderen i et tidsrum (calendarView
 * udfolder gentagne begivenheder, så de vises korrekt enkeltvis).
 */
export async function listOutlookEvents(
  accessToken: string,
  startISO: string,
  endISO: string,
): Promise<OutlookEvent[]> {
  const params = new URLSearchParams({
    startDateTime: startISO,
    endDateTime: endISO,
    $select: "subject,bodyPreview,location,start,end,isAllDay",
    $orderby: "start/dateTime",
    $top: "250",
  });
  try {
    const res = await fetch(`${GRAPH}/me/calendarView?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        // Få start/end leveret i dansk tid frem for UTC.
        Prefer: 'outlook.timezone="Europe/Copenhagen"',
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const items = (data.value ?? []) as Record<string, unknown>[];
    return items.map((e) => {
      const start = e.start as { dateTime?: string } | undefined;
      const end = e.end as { dateTime?: string } | undefined;
      const loc = e.location as { displayName?: string } | undefined;
      // Graph leverer dateTime UDEN offset når Prefer-tidszonen er sat → tilføj
      // en +02:00/+01:00-agtig markør ved at lade Date tolke som lokal tid.
      const toISO = (dt?: string) =>
        dt ? new Date(dt.endsWith("Z") ? dt : `${dt}`).toISOString() : null;
      return {
        id: e.id as string,
        subject: (e.subject as string) ?? "(uden titel)",
        description: (e.bodyPreview as string) ?? null,
        location: loc?.displayName ?? null,
        startISO: toISO(start?.dateTime),
        endISO: toISO(end?.dateTime),
        allDay: Boolean(e.isAllDay),
      };
    });
  } catch {
    return [];
  }
}
