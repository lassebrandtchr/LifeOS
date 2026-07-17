import "server-only";

/**
 * Gmail API – tynd wrapper (kun læsning af indbakken).
 * Alle kald bruger et gyldigt access_token (hentes via features/integrations/google.ts).
 *
 * Gmail kræver to skridt: 1) list besked-id'er, 2) hent metadata pr. besked.
 */

const API = "https://gmail.googleapis.com/gmail/v1/users/me";

/**
 * Fejl fra Gmail-API'et, der bærer Googles EGEN forklaring med, så vi kan
 * skelne de to helt forskellige 403-årsager fra hinanden:
 *   • "insufficient authentication scopes" → Gmail-adgang blev ikke givet ved
 *     login (fluebenet ved Gmail var ikke sat) → løsning: forbind igen.
 *   • "has not been used ... or it is disabled" → Gmail-API'et er ikke slået
 *     til i Google Cloud-projektet → løsning: slå det til i Cloud Console.
 */
export class GmailApiError extends Error {
  constructor(
    readonly status: number,
    readonly reason: string,
  ) {
    super(`Gmail-listekald fejlede (${status})`);
    this.name = "GmailApiError";
  }
}

export type GmailMessage = {
  id: string;
  subject: string;
  snippet: string;
  from: string | null;
  isRead: boolean;
  receivedISO: string | null;
  /** Gmail-labels på beskeden – bruges til præcis kategorisering. */
  labelIds: string[];
};

/** En Gmail-mappe (label) til mappe-oversigten. */
export type GmailFolder = {
  id: string;
  name: string;
  /** 'system' (Indbakke, Sendt …) eller 'user' (egne mapper). */
  type: "system" | "user";
  unread: number;
  total: number;
};

/** Pæne danske navne til Gmails systemlabels. */
const SYSTEM_LABEL_NAMES: Record<string, string> = {
  INBOX: "Indbakke",
  SENT: "Sendt",
  DRAFT: "Kladder",
  TRASH: "Papirkurv",
  SPAM: "Spam",
  STARRED: "Med stjerne",
  IMPORTANT: "Vigtig",
  CATEGORY_PROMOTIONS: "Kampagner",
  CATEGORY_UPDATES: "Opdateringer",
  CATEGORY_SOCIAL: "Sociale",
  CATEGORY_FORUMS: "Fora",
};
// Systemlabels vi IKKE viser som mapper (tekniske/interne).
const HIDDEN_SYSTEM = new Set([
  "UNREAD", "CHAT", "CATEGORY_PERSONAL", "CATEGORY_PRIMARY",
]);

/** Henter Gmail-mapper (labels) med antal + ulæste. */
export async function listGmailFolders(accessToken: string): Promise<GmailFolder[]> {
  const listRes = await fetch(`${API}/labels`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!listRes.ok) throw new GmailApiError(listRes.status, "");
  const labels = ((await listRes.json()).labels ?? []) as {
    id: string;
    name: string;
    type: string;
    labelListVisibility?: string;
  }[];

  // Hent antal pr. label (kun for dem vi viser) via detaljeopslag.
  const wanted = labels.filter(
    (l) =>
      !HIDDEN_SYSTEM.has(l.id) &&
      (l.type === "user" || SYSTEM_LABEL_NAMES[l.id]) &&
      l.labelListVisibility !== "labelHide",
  );

  const folders = await Promise.all(
    wanted.map(async (l) => {
      let unread = 0;
      let total = 0;
      try {
        const d = await fetch(`${API}/labels/${l.id}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (d.ok) {
          const j = await d.json();
          unread = (j.messagesUnread as number) ?? 0;
          total = (j.messagesTotal as number) ?? 0;
        }
      } catch {
        /* antal er ikke kritisk */
      }
      return {
        id: l.id,
        name: l.type === "user" ? l.name : SYSTEM_LABEL_NAMES[l.id] ?? l.name,
        type: (l.type === "user" ? "user" : "system") as "system" | "user",
        unread,
        total,
      };
    }),
  );

  // Systemmapper først (Indbakke øverst), derefter egne mapper alfabetisk.
  const order = ["INBOX", "STARRED", "IMPORTANT", "SENT", "DRAFT", "SPAM", "TRASH"];
  return folders.sort((a, b) => {
    if (a.type !== b.type) return a.type === "system" ? -1 : 1;
    if (a.type === "system") {
      return (order.indexOf(a.id) + 1 || 99) - (order.indexOf(b.id) + 1 || 99);
    }
    return a.name.localeCompare(b.name, "da");
  });
}

/** Henter mails i en bestemt Gmail-mappe (label). */
export async function listGmailMessagesByLabel(
  accessToken: string,
  labelId: string,
  max = 30,
): Promise<GmailMessage[]> {
  const listRes = await fetch(
    `${API}/messages?maxResults=${max}&labelIds=${encodeURIComponent(labelId)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!listRes.ok) throw new GmailApiError(listRes.status, "");
  const ids = (((await listRes.json()).messages ?? []) as { id: string }[]).map((m) => m.id);

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
        const internalMs = m.internalDate ? Number(m.internalDate) : null;
        const labelIds = (m.labelIds ?? []) as string[];
        return {
          id: m.id as string,
          subject: header(headers, "Subject") ?? "(uden emne)",
          snippet: (m.snippet as string) ?? "",
          from: header(headers, "From"),
          isRead: !labelIds.includes("UNREAD"),
          receivedISO: internalMs ? new Date(internalMs).toISOString() : null,
          labelIds,
        } as GmailMessage;
      } catch {
        return null;
      }
    }),
  );
  return messages.filter((m): m is GmailMessage => m !== null);
}

/** Tilføj/fjern labels på en besked (bruges til arkivér + flyt til mappe). */
export async function modifyGmailLabels(
  accessToken: string,
  messageId: string,
  change: { add?: string[]; remove?: string[] },
): Promise<boolean> {
  const res = await fetch(`${API}/messages/${messageId}/modify`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ addLabelIds: change.add ?? [], removeLabelIds: change.remove ?? [] }),
  });
  return res.ok;
}

/** Flyt en besked i papirkurven (kan gendannes i Gmail i 30 dage). */
export async function trashGmailMessage(
  accessToken: string,
  messageId: string,
): Promise<boolean> {
  const res = await fetch(`${API}/messages/${messageId}/trash`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.ok;
}

/**
 * Henter brugerens EGEN Gmail-signatur (HTML) fra Gmail-indstillingerne.
 *
 * Gmail gemmer én signatur pr. afsender-adresse (sendAs). Vi bruger
 * standard-adressens signatur, så svar automatisk får præcis den signatur,
 * Lasse selv har sat op i Gmail. Kræver scopet gmail.settings.basic.
 *
 * Returnerer null hvis der ingen signatur er, eller hvis scopet mangler
 * (gammelt token) – så falder svaret bare tilbage til ingen signatur.
 */
export async function getGmailSignature(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch(`${API}/settings/sendAs`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const list = (data.sendAs ?? []) as {
      isDefault?: boolean;
      isPrimary?: boolean;
      signature?: string;
    }[];
    const chosen =
      list.find((s) => s.isDefault && s.signature) ??
      list.find((s) => s.isPrimary && s.signature) ??
      list.find((s) => s.signature);
    const sig = chosen?.signature?.trim();
    return sig ? sig : null;
  } catch {
    return null;
  }
}

function header(headers: { name?: string; value?: string }[], name: string): string | null {
  const h = headers.find((x) => x.name?.toLowerCase() === name.toLowerCase());
  return h?.value ?? null;
}

/**
 * Henter de seneste mails fra Gmail-indbakken (med emne, afsender, uddrag).
 *
 * VIGTIGT: kaster en fejl hvis selve liste-kaldet fejler (fx udløbet token,
 * manglende scope) i stedet for at returnere en tom liste. En tom liste skal
 * KUN betyde "indbakken er reelt tom lige nu" – ellers overskriver
 * syncGmailCore stille og roligt en fungerende cache med "ingen mails", når
 * det reelle problem er et fejlet API-kald.
 */
export async function listGmailMessages(
  accessToken: string,
  max = 25,
): Promise<GmailMessage[]> {
  const listRes = await fetch(
    `${API}/messages?maxResults=${max}&q=${encodeURIComponent("in:inbox")}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!listRes.ok) {
    // Læs Googles egen fejlbesked med, så kalderen kan oversætte den til en
    // handlingsanvisning (se GmailApiError). Bodyen ser typisk sådan ud:
    //   { "error": { "code": 403, "message": "Request had insufficient
    //     authentication scopes.", "status": "PERMISSION_DENIED" } }
    const reason = await listRes
      .json()
      .then((b) => (b?.error?.message as string) ?? "")
      .catch(() => "");
    throw new GmailApiError(listRes.status, reason);
  }
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
          labelIds,
        } as GmailMessage;
      } catch {
        // Kun ÉN besked kunne ikke hentes – ikke en grund til at fejle hele synkroniseringen.
        return null;
      }
    }),
  );

  return messages.filter((m): m is GmailMessage => m !== null);
}
