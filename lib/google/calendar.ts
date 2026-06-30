import "server-only";

/**
 * Google Kalender API – tynd wrapper (kun det LifeOS bruger).
 * Alle kald bruger et gyldigt access_token (hentes via features/integrations/google.ts).
 */

const API = "https://www.googleapis.com/calendar/v3";

function eventsUrl(calendarId: string) {
  return `${API}/calendars/${encodeURIComponent(calendarId)}/events`;
}

export type GoogleEventInput = {
  summary: string;
  startISO: string; // fuld ISO med offset, fx 2026-07-03T17:30:00+02:00
  endISO: string;
  location?: string | null;
  description?: string | null;
  timeZone?: string;
};

/** Opretter en begivenhed på brugerens primære (private) Google-kalender. */
export async function createGoogleEvent(
  accessToken: string,
  input: GoogleEventInput,
): Promise<{ id: string; htmlLink: string } | null> {
  const res = await fetch(eventsUrl("primary"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      summary: input.summary,
      location: input.location || undefined,
      description: input.description || undefined,
      start: { dateTime: input.startISO, timeZone: input.timeZone ?? "Europe/Copenhagen" },
      end: { dateTime: input.endISO, timeZone: input.timeZone ?? "Europe/Copenhagen" },
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return { id: data.id as string, htmlLink: (data.htmlLink as string) ?? "" };
}

export type GoogleEvent = {
  id: string;
  summary: string;
  description: string | null;
  location: string | null;
  startISO: string | null;
  endISO: string | null;
  allDay: boolean;
  /** Navnet på den kalender, begivenheden kom fra (fx "Hanne og Lasse"). */
  calendarName: string;
};

type CalendarRef = { id: string; summary: string };

/** Støj-kalendere vi IKKE vil hente (helligdage, ugenumre, fødselsdage-feed). */
function isNoiseCalendar(id: string): boolean {
  return /#(holiday|weeknum|contacts)@|group\.v\.calendar\.google\.com/.test(id);
}

/** Henter alle kalendere i brugerens liste (primær + delte som "Hanne og Lasse"). */
export async function listCalendars(accessToken: string): Promise<CalendarRef[]> {
  try {
    const res = await fetch(`${API}/users/me/calendarList?minAccessRole=reader`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return ((data.items ?? []) as Record<string, unknown>[])
      .map((c) => ({
        id: c.id as string,
        summary: (c.summary as string) ?? (c.id as string),
      }))
      .filter((c) => !isNoiseCalendar(c.id));
  } catch {
    return [];
  }
}

/** Henter begivenheder fra ÉN kalender i et tidsrum. */
export async function listEventsFromCalendar(
  accessToken: string,
  cal: CalendarRef,
  timeMinISO: string,
  timeMaxISO: string,
): Promise<GoogleEvent[]> {
  const params = new URLSearchParams({
    timeMin: timeMinISO,
    timeMax: timeMaxISO,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });
  try {
    const res = await fetch(`${eventsUrl(cal.id)}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const items = (data.items ?? []) as Record<string, unknown>[];
    return items.map((e) => {
      const start = e.start as { dateTime?: string; date?: string } | undefined;
      const end = e.end as { dateTime?: string; date?: string } | undefined;
      return {
        id: e.id as string,
        summary: (e.summary as string) ?? "(uden titel)",
        description: (e.description as string) ?? null,
        location: (e.location as string) ?? null,
        startISO: start?.dateTime ?? start?.date ?? null,
        endISO: end?.dateTime ?? end?.date ?? null,
        allDay: Boolean(start?.date && !start?.dateTime),
        calendarName: cal.summary,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Henter begivenheder fra ALLE brugerens kalendere i et tidsrum og samler dem
 * (dedupliceret på event-id). Sådan kommer fx "Hanne og Lasse" også med.
 */
export async function listAllGoogleEvents(
  accessToken: string,
  timeMinISO: string,
  timeMaxISO: string,
): Promise<GoogleEvent[]> {
  let calendars = await listCalendars(accessToken);
  // Fallback: kan vi (endnu) ikke liste kalendere (fx manglende rettighed),
  // så hent dog i det mindste fra den primære kalender.
  if (calendars.length === 0) {
    calendars = [{ id: "primary", summary: "primary" }];
  }

  const perCalendar = await Promise.all(
    calendars.map((cal) =>
      listEventsFromCalendar(accessToken, cal, timeMinISO, timeMaxISO),
    ),
  );

  const seen = new Set<string>();
  const all: GoogleEvent[] = [];
  for (const list of perCalendar) {
    for (const ev of list) {
      if (ev.id && !seen.has(ev.id)) {
        seen.add(ev.id);
        all.push(ev);
      }
    }
  }
  return all;
}
