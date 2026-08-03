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
  if (!listRes.ok) {
    // Tag Googles egen forklaring med (fx "insufficient authentication
    // scopes"), så kalderen kan vise den PRÆCISE årsag.
    const reason = await listRes
      .json()
      .then((b) => (b?.error?.message as string) ?? "")
      .catch(() => "");
    throw new GmailApiError(listRes.status, reason);
  }
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

  // VIGTIGT: hent IKKE antal pr. mappe med et kald pr. label. Det gav 30-40
  // ekstra forespørgsler, som kunne overskride serverless-funktionens tidsloft
  // og give en 500-fejl. Ét /labels-kald er nok til at vise mapperne (uden
  // ulæst-tal). Mappe-listen er det vigtige; tallene var kun pynt.
  const folders: GmailFolder[] = wanted.map((l) => ({
    id: l.id,
    name: (l.type === "user" ? l.name : SYSTEM_LABEL_NAMES[l.id] ?? l.name) ?? l.id,
    type: (l.type === "user" ? "user" : "system") as "system" | "user",
    unread: 0,
    total: 0,
  }));

  // Systemmapper først (Indbakke øverst), derefter egne mapper alfabetisk.
  const order = ["INBOX", "STARRED", "IMPORTANT", "SENT", "DRAFT", "SPAM", "TRASH"];
  return folders.sort((a, b) => {
    if (a.type !== b.type) return a.type === "system" ? -1 : 1;
    if (a.type === "system") {
      return (order.indexOf(a.id) + 1 || 99) - (order.indexOf(b.id) + 1 || 99);
    }
    return (a.name ?? "").localeCompare(b.name ?? "", "da");
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

/** Tilføj/fjern labels på op til 1.000 beskeder i ét Gmail-kald. */
export async function batchModifyGmailLabels(
  accessToken: string,
  messageIds: string[],
  change: { add?: string[]; remove?: string[] },
): Promise<boolean> {
  if (messageIds.length === 0) return true;
  const res = await fetch(`${API}/messages/batchModify`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      ids: messageIds,
      addLabelIds: change.add ?? [],
      removeLabelIds: change.remove ?? [],
    }),
  });
  return res.ok;
}

/**
 * Finder eller opretter de labels, AIOS selv ejer. Id'er findes dynamisk, så
 * handlingen aldrig afhænger af Gmail-id'er fra en bestemt konto.
 */
export async function ensureGmailLabels(
  accessToken: string,
  names: string[],
): Promise<Record<string, string> | null> {
  const uniqueNames = [...new Set(names.filter(Boolean))];
  if (uniqueNames.length === 0) return {};

  const listRes = await fetch(`${API}/labels`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!listRes.ok) return null;

  const labels = ((await listRes.json()).labels ?? []) as { id: string; name: string }[];
  const byName = new Map(labels.map((label) => [label.name, label.id]));

  for (const name of uniqueNames) {
    if (byName.has(name)) continue;
    const createRes = await fetch(`${API}/labels`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name, labelListVisibility: "labelShow", messageListVisibility: "show" }),
    });
    if (createRes.ok) {
      const created = (await createRes.json()) as { id: string; name: string };
      byName.set(created.name, created.id);
      continue;
    }

    // Et parallelt kald kan have oprettet labelen først.
    if (createRes.status === 409) {
      const retry = await fetch(`${API}/labels`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (retry.ok) {
        const retryLabels = ((await retry.json()).labels ?? []) as { id: string; name: string }[];
        const found = retryLabels.find((label) => label.name === name);
        if (found) {
          byName.set(found.name, found.id);
          continue;
        }
      }
    }
    return null;
  }

  return Object.fromEntries(
    uniqueNames.flatMap((name) => {
      const id = byName.get(name);
      return id ? [[name, id]] : [];
    }),
  );
}

export type GmailTrashResult =
  | { ok: true }
  | { ok: false; status: number | null; reason: string };

/** Flyt en besked i papirkurven (kan gendannes i Gmail i 30 dage). */
export async function trashGmailMessage(
  accessToken: string,
  messageId: string,
): Promise<GmailTrashResult> {
  try {
    const res = await fetch(`${API}/messages/${encodeURIComponent(messageId)}/trash`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) return { ok: true };
    const reason = await res
      .json()
      .then((body) => (body?.error?.message as string) ?? "")
      .catch(() => "");
    return { ok: false, status: res.status, reason };
  } catch {
    return { ok: false, status: null, reason: "Netværksfejl ved forbindelse til Gmail." };
  }
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

/**
 * Henter ID'er på HELE den aktuelle Gmail-indbakke uden at hente hver mails
 * indhold. Bruges som sandhed ved oprydning af den lokale mail-cache: mails
 * fjernes kun fra AIOS, når de heller ikke længere ligger i Gmail-indbakken.
 */
export async function listAllGmailInboxMessageIds(accessToken: string): Promise<string[]> {
  const ids: string[] = [];
  let pageToken: string | null = null;

  do {
    const params = new URLSearchParams({ maxResults: "500", labelIds: "INBOX" });
    if (pageToken) params.set("pageToken", pageToken);
    const res = await fetch(`${API}/messages?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const reason = await res
        .json()
        .then((body) => (body?.error?.message as string) ?? "")
        .catch(() => "");
      throw new GmailApiError(res.status, reason);
    }
    const page = await res.json();
    ids.push(...((page.messages ?? []) as { id: string }[]).map((message) => message.id));
    pageToken = (page.nextPageToken as string | null | undefined) ?? null;
  } while (pageToken);

  return ids;
}
