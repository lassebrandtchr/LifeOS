"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getValidAccessToken } from "@/features/integrations/google";
import { getValidMicrosoftToken } from "@/features/integrations/microsoft";
import { getGmailSignature } from "@/lib/google/gmail";
import { categoryById } from "@/features/integrations/categorize";

// ─── Types ────────────────────────────────────────────────────────────────────

export type EmailAttachment = {
  /** Udbyderens attachment-id (bruges af getEmailAttachment). */
  id: string;
  name: string;
  mime: string;
  size: number;
};

export type EmailDetail = {
  id: string;
  subject: string | null;
  from_addr: string | null;
  workspace: string;
  received_at: string | null;
  snippet: string | null;
  /** Fuld HTML-brødtekst (saniteret) – vises i en sandboxet iframe. */
  bodyHtml: string | null;
  /** Ren tekst-fallback hvis mailen ikke har HTML. */
  body: string | null;
  external_id: string | null;
  /** Rigtige vedhæftninger (inline-billeder er allerede indlejret i bodyHtml). */
  attachments: EmailAttachment[];
};

export type ReplyResult = { ok: boolean; error?: string };

/** Én besked i en mail-tråd (samtale frem og tilbage). */
export type ThreadMessage = {
  /** Udbyderens besked-id (bruges til at hente vedhæftninger for netop denne). */
  messageId: string;
  from: string | null;
  date: string | null;
  /** Er beskeden sendt AF Lasse selv (dvs. et svar)? */
  fromMe: boolean;
  bodyHtml: string | null;
  body: string | null;
  attachments: EmailAttachment[];
};

export type EmailThread = {
  id: string;
  subject: string | null;
  workspace: string;
  external_id: string | null;
  /** Alle beskeder i samtalen, ældste først. */
  messages: ThreadMessage[];
  /** Har Lasse svaret i denne tråd? (styrer "Besvaret"-badgen) */
  repliedByUser: boolean;
};

// ─── Sanitering ───────────────────────────────────────────────────────────────
// Fjerner aktivt indhold fra mail-HTML. Bælte OG seler: klienten viser
// desuden HTML'en i en sandboxet iframe uden allow-scripts/allow-same-origin,
// så scripts kan ikke køre selv hvis noget slap igennem her.

function sanitizeEmailHtml(html: string): string {
  return (
    html
      // Hele farlige blokke (indhold + tags). <style> beholdes bevidst –
      // nyhedsbreve er ofte ulæselige uden deres CSS.
      .replace(/<script\b[\s\S]*?<\/script\s*>/gi, "")
      .replace(/<(iframe|object|embed|applet|frame|frameset)\b[\s\S]*?(<\/\1\s*>|\/?>)/gi, "")
      // Enkeltstående farlige tags
      .replace(/<\/?(form|input|button|select|textarea|meta|base|link)\b[^>]*>/gi, "")
      // Event handlers (onclick, onload, onerror …)
      .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
      // javascript:-URL'er i href/src
      .replace(/\s(href|src)\s*=\s*(["']?)\s*javascript:[^"'>\s]*\2/gi, "")
  );
}

/** Groft tekst-uddrag af HTML (fallback + søgbarhed). */
function htmlToText(html: string): string {
  return html
    .replace(/<style\b[\s\S]*?<\/style\s*>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// Inline-billeder indlejres som data-URI'er. Loft, så en mail med kæmpe
// billeder ikke giver et gigantisk svar til klienten.
const MAX_INLINE_BYTES = 6 * 1024 * 1024;

// ─── Gmail helpers ────────────────────────────────────────────────────────────

type GmailPart = {
  partId?: string;
  mimeType?: string;
  filename?: string;
  headers?: { name: string; value: string }[];
  body?: { data?: string; attachmentId?: string; size?: number };
  parts?: GmailPart[];
};

function walkGmailParts(part: GmailPart, visit: (p: GmailPart) => void) {
  visit(part);
  for (const p of part.parts ?? []) walkGmailParts(p, visit);
}

function gmailHeader(part: GmailPart, name: string): string | null {
  return (
    part.headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())
      ?.value ?? null
  );
}

async function fetchGmailAttachment(
  token: string,
  messageId: string,
  attachmentId: string,
): Promise<Buffer | null> {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
  );
  if (!res.ok) return null;
  const json = await res.json();
  return json.data ? Buffer.from(json.data as string, "base64url") : null;
}

async function loadGmailDetail(
  token: string,
  externalId: string,
  base: EmailDetail,
): Promise<void> {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${externalId}?format=full`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
  );
  if (!res.ok) return;
  const msg = await res.json();
  const payload = (msg.payload ?? {}) as GmailPart;

  let html: string | null = null;
  let text: string | null = null;
  const inline: { contentId: string; attachmentId: string; mime: string }[] = [];

  walkGmailParts(payload, (p) => {
    const mime = p.mimeType ?? "";
    if (!html && mime === "text/html" && p.body?.data) {
      html = Buffer.from(p.body.data, "base64url").toString("utf-8");
    }
    if (!text && mime === "text/plain" && p.body?.data) {
      text = Buffer.from(p.body.data, "base64url").toString("utf-8");
    }
    if (p.body?.attachmentId) {
      const contentId = gmailHeader(p, "Content-ID");
      if (contentId && mime.startsWith("image/")) {
        inline.push({
          contentId: contentId.replace(/^<|>$/g, ""),
          attachmentId: p.body.attachmentId,
          mime,
        });
      } else if (p.filename) {
        base.attachments.push({
          id: p.body.attachmentId,
          name: p.filename,
          mime: mime || "application/octet-stream",
          size: p.body.size ?? 0,
        });
      }
    }
  });

  // Indlejr inline-billeder (cid:) som data-URI'er, så de vises i appen.
  if (html && inline.length > 0) {
    let budget = MAX_INLINE_BYTES;
    for (const img of inline) {
      if (budget <= 0) break;
      const buf = await fetchGmailAttachment(token, externalId, img.attachmentId);
      if (!buf) continue;
      budget -= buf.length;
      const dataUri = `data:${img.mime};base64,${buf.toString("base64")}`;
      html = (html as string).split(`cid:${img.contentId}`).join(dataUri);
    }
  }

  base.bodyHtml = html ? sanitizeEmailHtml(html) : null;
  base.body = text ?? (html ? htmlToText(html) : null) ?? (msg.snippet as string | null) ?? null;
}

/** Kun e-mailadressen ud af en "Navn <adresse>"-streng. */
function bareEmail(value: string | null): string | null {
  if (!value) return null;
  const m = value.match(/<([^>]+)>/);
  return (m ? m[1] : value).trim().toLowerCase();
}

/** Parser ÉN Gmail-besked (format=full JSON) til en ThreadMessage. */
async function parseGmailMessage(
  token: string,
  msg: Record<string, unknown>,
  userEmail: string | null,
): Promise<ThreadMessage> {
  const payload = (msg.payload ?? {}) as GmailPart;
  const fromHeader = gmailHeader(payload, "From");
  const dateHeader = gmailHeader(payload, "Date");
  const internalMs = msg.internalDate ? Number(msg.internalDate) : null;
  const labelIds = (msg.labelIds ?? []) as string[];

  let html: string | null = null;
  let text: string | null = null;
  const inline: { contentId: string; attachmentId: string; mime: string }[] = [];
  const attachments: EmailAttachment[] = [];

  walkGmailParts(payload, (p) => {
    const mime = p.mimeType ?? "";
    if (!html && mime === "text/html" && p.body?.data) {
      html = Buffer.from(p.body.data, "base64url").toString("utf-8");
    }
    if (!text && mime === "text/plain" && p.body?.data) {
      text = Buffer.from(p.body.data, "base64url").toString("utf-8");
    }
    if (p.body?.attachmentId) {
      const contentId = gmailHeader(p, "Content-ID");
      if (contentId && mime.startsWith("image/")) {
        inline.push({ contentId: contentId.replace(/^<|>$/g, ""), attachmentId: p.body.attachmentId, mime });
      } else if (p.filename) {
        attachments.push({
          id: p.body.attachmentId,
          name: p.filename,
          mime: mime || "application/octet-stream",
          size: p.body.size ?? 0,
        });
      }
    }
  });

  if (html && inline.length > 0) {
    let budget = MAX_INLINE_BYTES;
    for (const img of inline) {
      if (budget <= 0) break;
      const buf = await fetchGmailAttachment(token, msg.id as string, img.attachmentId);
      if (!buf) continue;
      budget -= buf.length;
      const dataUri = `data:${img.mime};base64,${buf.toString("base64")}`;
      html = (html as string).split(`cid:${img.contentId}`).join(dataUri);
    }
  }

  // "Fra mig" = beskeden har SENT-label, eller afsenderen er Lasses egen adresse.
  const fromMe =
    labelIds.includes("SENT") ||
    (Boolean(userEmail) && bareEmail(fromHeader) === userEmail!.toLowerCase());

  return {
    messageId: msg.id as string,
    from: fromHeader,
    date: internalMs ? new Date(internalMs).toISOString() : dateHeader ? new Date(dateHeader).toISOString() : null,
    fromMe,
    bodyHtml: html ? sanitizeEmailHtml(html) : null,
    body: text ?? (html ? htmlToText(html) : null) ?? ((msg.snippet as string | null) ?? null),
    attachments,
  };
}

/** Henter HELE Gmail-tråden (alle beskeder frem og tilbage). */
async function loadGmailThread(
  token: string,
  messageExternalId: string,
  userEmail: string | null,
): Promise<{ messages: ThreadMessage[]; repliedByUser: boolean }> {
  // 1) Find trådens id ud fra beskeden.
  const metaRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageExternalId}?format=minimal`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
  );
  if (!metaRes.ok) return { messages: [], repliedByUser: false };
  const threadId = (await metaRes.json()).threadId as string | undefined;
  if (!threadId) return { messages: [], repliedByUser: false };

  // 2) Hent hele tråden i fuldt format.
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}?format=full`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
  );
  if (!res.ok) return { messages: [], repliedByUser: false };
  const data = await res.json();
  const rawMessages = (data.messages ?? []) as Record<string, unknown>[];

  const messages = await Promise.all(
    rawMessages.map((m) => parseGmailMessage(token, m, userEmail)),
  );
  return {
    messages,
    repliedByUser: messages.some((m) => m.fromMe),
  };
}

// ─── Outlook (Microsoft Graph) helpers ────────────────────────────────────────

type GraphAttachment = {
  id: string;
  name?: string;
  contentType?: string;
  size?: number;
  isInline?: boolean;
  contentId?: string | null;
  contentBytes?: string;
};

async function loadOutlookDetail(
  token: string,
  externalId: string,
  base: EmailDetail,
): Promise<void> {
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages/${externalId}?$select=body,hasAttachments`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
  );
  if (!res.ok) return;
  const msg = await res.json();
  const contentType = (msg.body?.contentType as string | undefined) ?? "html";
  let html: string | null =
    contentType.toLowerCase() === "html" ? ((msg.body?.content as string) ?? null) : null;
  const text: string | null =
    contentType.toLowerCase() !== "html" ? ((msg.body?.content as string) ?? null) : null;

  if (msg.hasAttachments || (html && html.includes("cid:"))) {
    // Hent vedhæftnings-LISTEN uden indhold (contentBytes) – bytes hentes
    // kun for inline-billeder her, og for rigtige filer først ved klik.
    const listRes = await fetch(
      `https://graph.microsoft.com/v1.0/me/messages/${externalId}/attachments?$select=id,name,contentType,size,isInline,contentId`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
    );
    if (listRes.ok) {
      const list = (await listRes.json()).value as GraphAttachment[];
      let budget = MAX_INLINE_BYTES;
      for (const att of list ?? []) {
        const mime = att.contentType ?? "application/octet-stream";
        const isInlineImage = att.isInline && att.contentId && mime.startsWith("image/");
        if (isInlineImage && html && budget > 0) {
          const one = await fetch(
            `https://graph.microsoft.com/v1.0/me/messages/${externalId}/attachments/${att.id}`,
            { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
          );
          if (one.ok) {
            const full = (await one.json()) as GraphAttachment;
            if (full.contentBytes) {
              budget -= (full.size ?? 0) || full.contentBytes.length;
              const dataUri = `data:${mime};base64,${full.contentBytes}`;
              html = html.split(`cid:${att.contentId}`).join(dataUri);
            }
          }
        } else if (!att.isInline) {
          base.attachments.push({
            id: att.id,
            name: att.name ?? "vedhæftning",
            mime,
            size: att.size ?? 0,
          });
        }
      }
    }
  }

  base.bodyHtml = html ? sanitizeEmailHtml(html) : null;
  base.body = text ?? (html ? htmlToText(html) : null);
}

/** Parser ÉN Graph-besked (m. body + inline-billeder) til en ThreadMessage. */
async function parseOutlookMessage(
  token: string,
  msg: Record<string, unknown>,
  userEmail: string | null,
): Promise<ThreadMessage> {
  const id = msg.id as string;
  const bodyObj = msg.body as { contentType?: string; content?: string } | undefined;
  const contentType = (bodyObj?.contentType ?? "html").toLowerCase();
  let html: string | null = contentType === "html" ? (bodyObj?.content ?? null) : null;
  const text: string | null = contentType !== "html" ? (bodyObj?.content ?? null) : null;
  const attachments: EmailAttachment[] = [];
  const fromAddr =
    ((msg.from as { emailAddress?: { address?: string; name?: string } } | undefined)?.emailAddress
      ?.address) ?? null;
  const fromName =
    ((msg.from as { emailAddress?: { address?: string; name?: string } } | undefined)?.emailAddress
      ?.name) ?? null;

  if (msg.hasAttachments || (html && html.includes("cid:"))) {
    const listRes = await fetch(
      `https://graph.microsoft.com/v1.0/me/messages/${id}/attachments?$select=id,name,contentType,size,isInline,contentId`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
    );
    if (listRes.ok) {
      const list = (await listRes.json()).value as GraphAttachment[];
      let budget = MAX_INLINE_BYTES;
      for (const att of list ?? []) {
        const mime = att.contentType ?? "application/octet-stream";
        const isInlineImage = att.isInline && att.contentId && mime.startsWith("image/");
        if (isInlineImage && html && budget > 0) {
          const one = await fetch(
            `https://graph.microsoft.com/v1.0/me/messages/${id}/attachments/${att.id}`,
            { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
          );
          if (one.ok) {
            const full = (await one.json()) as GraphAttachment;
            if (full.contentBytes) {
              budget -= (full.size ?? 0) || full.contentBytes.length;
              html = html.split(`cid:${att.contentId}`).join(`data:${mime};base64,${full.contentBytes}`);
            }
          }
        } else if (!att.isInline) {
          attachments.push({ id: att.id, name: att.name ?? "vedhæftning", mime, size: att.size ?? 0 });
        }
      }
    }
  }

  return {
    messageId: id,
    from: fromName ? `${fromName} <${fromAddr ?? ""}>` : fromAddr,
    date: (msg.sentDateTime as string | null) ?? (msg.receivedDateTime as string | null) ?? null,
    fromMe: Boolean(userEmail && fromAddr && fromAddr.toLowerCase() === userEmail.toLowerCase()),
    bodyHtml: html ? sanitizeEmailHtml(html) : null,
    body: text ?? (html ? htmlToText(html) : null),
    attachments,
  };
}

/** Henter HELE Outlook-samtalen (alle beskeder i conversationId). */
async function loadOutlookThread(
  token: string,
  messageExternalId: string,
  userEmail: string | null,
): Promise<{ messages: ThreadMessage[]; repliedByUser: boolean }> {
  const metaRes = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages/${messageExternalId}?$select=conversationId`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
  );
  if (!metaRes.ok) return { messages: [], repliedByUser: false };
  const conversationId = (await metaRes.json()).conversationId as string | undefined;
  if (!conversationId) return { messages: [], repliedByUser: false };

  const listRes = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages?$filter=conversationId eq '${encodeURIComponent(
      conversationId,
    )}'&$select=id,from,sentDateTime,receivedDateTime,body,hasAttachments&$orderby=receivedDateTime asc&$top=30`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
  );
  if (!listRes.ok) return { messages: [], repliedByUser: false };
  const raw = ((await listRes.json()).value ?? []) as Record<string, unknown>[];
  const messages = await Promise.all(raw.map((m) => parseOutlookMessage(token, m, userEmail)));
  return { messages, repliedByUser: messages.some((m) => m.fromMe) };
}

// ─── Server actions ───────────────────────────────────────────────────────────

/**
 * Henter HELE mail-tråden (samtale frem og tilbage) i fuldt format, så man kan
 * læse hele korrespondancen – og se om Lasse selv har svaret (repliedByUser).
 */
export async function getEmailThread(emailId: string): Promise<EmailThread | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("emails")
    .select("id, subject, workspace, external_id, source, snippet, from_addr, received_at")
    .eq("id", emailId)
    .maybeSingle();
  if (!data) return null;

  const base: EmailThread = {
    id: data.id as string,
    subject: (data.subject as string | null) ?? null,
    workspace: data.workspace as string,
    external_id: (data.external_id as string | null) ?? null,
    messages: [],
    repliedByUser: false,
  };
  if (!base.external_id) return base;

  const source = (data.source as string | null) ?? (base.workspace === "work" ? "outlook" : "gmail");
  try {
    if (source === "gmail") {
      const token = await getValidAccessToken();
      const { getGoogleConnection } = await import("@/features/integrations/google");
      const conn = await getGoogleConnection();
      if (token) {
        const t = await loadGmailThread(token, base.external_id, conn?.email ?? null);
        base.messages = t.messages;
        base.repliedByUser = t.repliedByUser;
      }
    } else if (source === "outlook") {
      const token = await getValidMicrosoftToken();
      const { getMicrosoftConnection } = await import("@/features/integrations/microsoft");
      const conn = await getMicrosoftConnection().catch(() => null);
      if (token) {
        const t = await loadOutlookThread(token, base.external_id, conn?.email ?? null);
        base.messages = t.messages;
        base.repliedByUser = t.repliedByUser;
      }
    }
  } catch {
    // live-hentning fejlede – vi falder tilbage til det gemte uddrag nedenfor
  }

  // FALDER LIVE-HENTNINGEN UD, så mailen ALTID kan åbnes: byg én besked af det
  // uddrag, der allerede er gemt i databasen. Uden dette viste en enkelt
  // mislykket Gmail-forespørgsel bare "Kunne ikke hente mail-indhold", selvom
  // Gmail er forbundet (fx et kortvarigt hik eller en enkelt besked Gmail ikke
  // ville udlevere). Nu ser man i det mindste emne + uddrag.
  if (base.messages.length === 0) {
    base.messages = [
      {
        messageId: base.external_id,
        from: (data.from_addr as string | null) ?? null,
        date: (data.received_at as string | null) ?? null,
        fromMe: false,
        bodyHtml: null,
        body:
          (data.snippet as string | null) ??
          "Kunne ikke hente hele mailen lige nu – prøv igen om lidt.",
        attachments: [],
      },
    ];
  }

  // At åbne en mail = den er læst. Og har tråden et svar fra Lasse (også hvis
  // svaret blev sendt i Gmail/Outlook direkte), så markér "besvaret". Sætter
  // aldrig noget FALSK – kun opgraderer. Defensivt: 'replied' findes måske
  // ikke endnu (migration 0017), så et fejlet update må ikke vælte visningen.
  try {
    await supabase.from("emails").update({ is_read: true }).eq("id", emailId);
    if (base.repliedByUser) {
      await supabase.from("emails").update({ replied: true }).eq("id", emailId);
    }
    revalidatePath("/mail");
    revalidatePath("/");
  } catch {
    /* markering ikke kritisk */
  }
  return base;
}

/**
 * Henter mail i FULDT format: HTML-brødtekst (saniteret, med inline-billeder
 * indlejret) + liste over vedhæftninger. Kilden vælges ud fra mailens
 * source-kolonne (gmail/outlook) – IKKE workspace, som kan være historisk
 * fejlplaceret.
 */
export async function getEmailDetail(emailId: string): Promise<EmailDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("emails")
    .select("id, subject, from_addr, workspace, received_at, snippet, external_id, source")
    .eq("id", emailId)
    .maybeSingle();

  if (!data) return null;

  const base: EmailDetail = {
    id: data.id as string,
    subject: (data.subject as string | null) ?? null,
    from_addr: (data.from_addr as string | null) ?? null,
    workspace: data.workspace as string,
    received_at: (data.received_at as string | null) ?? null,
    snippet: (data.snippet as string | null) ?? null,
    external_id: (data.external_id as string | null) ?? null,
    bodyHtml: null,
    body: null,
    attachments: [],
  };

  if (!base.external_id) return base;
  const source = (data.source as string | null) ?? (base.workspace === "work" ? "outlook" : "gmail");

  try {
    if (source === "gmail") {
      const token = await getValidAccessToken();
      if (token) await loadGmailDetail(token, base.external_id, base);
    } else if (source === "outlook") {
      const token = await getValidMicrosoftToken();
      if (token) await loadOutlookDetail(token, base.external_id, base);
    }
  } catch {
    // falder tilbage til snippet – UI viser stadig mailen
  }

  return base;
}

/**
 * Som getEmailThread, men ud fra et Gmail-besked-id DIREKTE (uden en DB-række).
 * Bruges når man åbner en mail fra en Gmail-MAPPE (mappens mails er ikke synket
 * ned i databasen – de læses live fra Gmail).
 */
export async function getEmailThreadByExternalId(
  externalId: string,
): Promise<EmailThread | null> {
  try {
    const token = await getValidAccessToken();
    if (!token) return null;
    const { getGoogleConnection } = await import("@/features/integrations/google");
    const conn = await getGoogleConnection();
    const t = await loadGmailThread(token, externalId, conn?.email ?? null);
    return {
      id: externalId,
      subject: null, // headeren i læseren bruger mailens egne felter
      workspace: "private",
      external_id: externalId,
      messages: t.messages,
      repliedByUser: t.repliedByUser,
    };
  } catch {
    return null;
  }
}

export type AttachmentContent = {
  name: string;
  mime: string;
  /** Base64-indhold – klienten laver en Blob til visning/download. */
  base64: string;
};

/**
 * Henter én vedhæftnings indhold (ved klik – aldrig på forhånd).
 *
 * @param messageExternalId  Udbyder-id på den KONKRETE besked i tråden, som
 *   vedhæftningen sidder på. I en tråd med flere beskeder er det ikke
 *   nødvendigvis den åbnede mails eget id – derfor sender klienten det med.
 *   Udelades det, bruges den gemte mails eget external_id (bagudkompatibelt).
 */
export async function getEmailAttachment(
  emailId: string,
  attachmentId: string,
  messageExternalId?: string,
): Promise<AttachmentContent | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("emails")
    .select("external_id, source, workspace")
    .eq("id", emailId)
    .maybeSingle();
  if (!data?.external_id) return null;

  const source = (data.source as string | null) ?? (data.workspace === "work" ? "outlook" : "gmail");
  const msgId = messageExternalId || (data.external_id as string);

  try {
    if (source === "gmail") {
      const token = await getValidAccessToken();
      if (!token) return null;
      const buf = await fetchGmailAttachment(token, msgId, attachmentId);
      if (!buf) return null;
      return { name: "vedhæftning", mime: "application/octet-stream", base64: buf.toString("base64") };
    }
    if (source === "outlook") {
      const token = await getValidMicrosoftToken();
      if (!token) return null;
      const res = await fetch(
        `https://graph.microsoft.com/v1.0/me/messages/${msgId}/attachments/${attachmentId}`,
        { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
      );
      if (!res.ok) return null;
      const att = (await res.json()) as GraphAttachment;
      if (!att.contentBytes) return null;
      return {
        name: att.name ?? "vedhæftning",
        mime: att.contentType ?? "application/octet-stream",
        base64: att.contentBytes,
      };
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Sætter (eller rydder) en mails kategori MANUELT.
 *
 *  1) Gemmer kategorien i databasen (vises straks som badge i mail-visningen).
 *  2) Spejler den til Lasses EGEN Gmail-label, hvis kategorien har en (så den
 *     også bliver synlig i selve Gmail). Rent additivt – der fjernes aldrig
 *     mails eller andre labels, og fejler labelingen, gemmes kategorien
 *     alligevel.
 *
 * @param categoryId  en gyldig kategori-id, eller null for "Ingen".
 */
export async function setEmailCategory(
  emailId: string,
  categoryId: string | null,
): Promise<{ ok?: true; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Ikke logget ind." };

  // Valider mod de kendte kategorier (undgå at gemme vilkårlig tekst).
  const cat = categoryId ? categoryById(categoryId) : null;
  if (categoryId && !cat) return { error: "Ukendt kategori." };

  const { data, error } = await supabase
    .from("emails")
    .update({ category: cat?.id ?? null })
    .eq("id", emailId)
    .eq("user_id", user.id)
    .select("external_id, source")
    .maybeSingle();

  if (error) return { error: error.message };

  // Spejl til den rigtige Gmail-label (best effort – aldrig blokerende).
  if (
    cat?.gmailLabelId &&
    data?.external_id &&
    ((data.source as string | null) ?? "gmail") === "gmail"
  ) {
    try {
      const token = await getValidAccessToken();
      if (token) {
        await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${data.external_id}/modify`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ addLabelIds: [cat.gmailLabelId] }),
          },
        );
      }
    } catch {
      // Label kunne ikke sættes i Gmail – kategorien er stadig gemt i appen.
    }
  }

  revalidatePath("/mail");
  revalidatePath("/");
  revalidatePath("/privat");
  return { ok: true };
}

/** Sender et svar på en mail via Gmail (privat) eller Outlook (arbejde). */
/** Markér en mail som besvaret (defensivt – 'replied'-kolonnen kan mangle). */
async function markReplied(
  supabase: Awaited<ReturnType<typeof createClient>>,
  emailId: string,
): Promise<void> {
  try {
    await supabase.from("emails").update({ replied: true }).eq("id", emailId);
    revalidatePath("/mail");
    revalidatePath("/");
  } catch {
    /* ikke kritisk */
  }
}

export async function sendEmailReply(
  emailId: string,
  replyText: string,
): Promise<ReplyResult> {
  if (!replyText.trim()) return { ok: false, error: "Svar må ikke være tomt" };

  const supabase = await createClient();
  const { data } = await supabase
    .from("emails")
    .select("workspace, from_addr, subject, external_id, source")
    .eq("id", emailId)
    .maybeSingle();

  if (!data?.external_id) return { ok: false, error: "Mail ikke fundet" };

  const externalId = data.external_id as string;
  const source = (data.source as string | null) ?? ((data.workspace as string) === "work" ? "outlook" : "gmail");

  try {
    if (source === "gmail") {
      const token = await getValidAccessToken();
      if (!token) return { ok: false, error: "Gmail ikke forbundet" };

      // Hent original besked for threadId + Message-Id header
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${externalId}?format=metadata&metadataHeaders=Message-Id&metadataHeaders=From&metadataHeaders=Subject`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!msgRes.ok) return { ok: false, error: "Kunne ikke hente original mail" };
      const msg = await msgRes.json();

      const headers = (msg.payload?.headers ?? []) as { name: string; value: string }[];
      const getH = (n: string) =>
        headers.find((h) => h.name.toLowerCase() === n.toLowerCase())?.value ?? "";

      const messageId = getH("Message-Id");
      const fromHeader = getH("From");
      const toAddr = fromHeader || (data.from_addr as string) || "";
      const subject = `Re: ${(data.subject as string) ?? ""}`;

      // Hent Lasses egen Gmail-signatur og sæt den automatisk på svaret.
      // Sendes som HTML, så signaturens formatering/links/logo bevares.
      const signature = await getGmailSignature(token);
      const escaped = replyText
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br>");
      const htmlBody = signature
        ? `<div>${escaped}</div><br><br>${signature}`
        : `<div>${escaped}</div>`;

      // RFC 2822-besked med UTF-8 HTML-krop (base64-kodet, som Gmail kræver
      // for ikke-ASCII tegn i danske signaturer).
      const b64Body = Buffer.from(htmlBody, "utf-8").toString("base64");
      const lines = [
        `To: ${toAddr}`,
        `Subject: ${subject}`,
        ...(messageId ? [`In-Reply-To: ${messageId}`, `References: ${messageId}`] : []),
        "MIME-Version: 1.0",
        "Content-Type: text/html; charset=utf-8",
        "Content-Transfer-Encoding: base64",
        "",
        b64Body,
      ];
      const encoded = Buffer.from(lines.join("\r\n")).toString("base64url");

      const sendRes = await fetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ raw: encoded, threadId: msg.threadId }),
        },
      );
      if (sendRes.ok) {
        await markReplied(supabase, emailId);
        return { ok: true };
      }
      return { ok: false, error: "Gmail afvisede besked" };
    }

    if (source === "outlook") {
      const token = await getValidMicrosoftToken();
      if (!token) return { ok: false, error: "Outlook ikke forbundet" };

      const replyRes = await fetch(
        `https://graph.microsoft.com/v1.0/me/messages/${externalId}/reply`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ comment: replyText }),
        },
      );
      if (replyRes.ok) {
        await markReplied(supabase, emailId);
        return { ok: true };
      }
      return { ok: false, error: "Outlook afvisede besked" };
    }
  } catch {
    return { ok: false, error: "Netværksfejl – prøv igen" };
  }

  return { ok: false, error: "Ukendt mail-kilde" };
}
