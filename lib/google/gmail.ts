import "server-only";

/**
 * Gmail API – tynd wrapper (kun læsning af indbakken).
 * Alle kald bruger et gyldigt access_token (hentes via features/integrations/google.ts).
 *
 * Gmail kræver to skridt: 1) list besked-id'er, 2) hent metadata pr. besked.
 */

const API = "https://gmail.googleapis.com/gmail/v1/users/me";

export type GmailMessage = {
  id: string;
  subject: string;
  snippet: string;
  from: string | null;
  isRead: boolean;
  receivedISO: string | null;
};

function header(headers: { name?: string; value?: string }[], name: string): string | null {
  const h = headers.find((x) => x.name?.toLowerCase() === name.toLowerCase());
  return h?.value ?? null;
}

/** Henter de seneste mails fra Gmail-indbakken (med emne, afsender, uddrag). */
export async function listGmailMessages(
  accessToken: string,
  max = 25,
): Promise<GmailMessage[]> {
  try {
    const listRes = await fetch(
      `${API}/messages?maxResults=${max}&q=${encodeURIComponent("in:inbox")}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!listRes.ok) return [];
    const listData = await listRes.json();
    const ids = ((listData.messages ?? []) as { id: string }[]).map((m) => m.id);

    const messages = await Promise.all(
      ids.map(async (id) => {
        try {
          const params = new URLSearchParams({ format: "metadata" });
          params.append("metadataHeaders", "Subject");
          params.append("metadataHeaders", "From");
          params.append("metadataHeaders", "Date");
          const res = await fetch(`${API}/messages/${id}?${params.toString()}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (!res.ok) return null;
          const m = await res.json();
          const headers = (m.payload?.headers ?? []) as { name?: string; value?: string }[];
          const dateStr = header(headers, "Date");
          const internalMs = m.internalDate ? Number(m.internalDate) : null;
          const labelIds = (m.labelIds ?? []) as string[];
          return {
            id: m.id as string,
            subject: header(headers, "Subject") ?? "(uden emne)",
            snippet: (m.snippet as string) ?? "",
            from: header(headers, "From"),
            isRead: !labelIds.includes("UNREAD"),
            receivedISO: internalMs
              ? new Date(internalMs).toISOString()
              : dateStr
                ? new Date(dateStr).toISOString()
                : null,
          } as GmailMessage;
        } catch {
          return null;
        }
      }),
    );

    return messages.filter((m): m is GmailMessage => m !== null);
  } catch {
    return [];
  }
}
