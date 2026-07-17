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

// ─── Server actions ───────────────────────────────────────────────────────────

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

export type AttachmentContent = {
  name: string;
  mime: string;
  /** Base64-indhold – klienten laver en Blob til visning/download. */
  base64: string;
};

/** Henter én vedhæftnings indhold (ved klik – aldrig på forhånd). */
export async function getEmailAttachment(
  emailId: string,
  attachmentId: string,
): Promise<AttachmentContent | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("emails")
    .select("external_id, source, workspace")
    .eq("id", emailId)
    .maybeSingle();
  if (!data?.external_id) return null;

  const source = (data.source as string | null) ?? (data.workspace === "work" ? "outlook" : "gmail");

  try {
    if (source === "gmail") {
      const token = await getValidAccessToken();
      if (!token) return null;
      const buf = await fetchGmailAttachment(token, data.external_id as string, attachmentId);
      if (!buf) return null;
      return { name: "vedhæftning", mime: "application/octet-stream", base64: buf.toString("base64") };
    }
    if (source === "outlook") {
      const token = await getValidMicrosoftToken();
      if (!token) return null;
      const res = await fetch(
        `https://graph.microsoft.com/v1.0/me/messages/${data.external_id}/attachments/${attachmentId}`,
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
      return sendRes.ok ? { ok: true } : { ok: false, error: "Gmail afvisede besked" };
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
      return replyRes.ok ? { ok: true } : { ok: false, error: "Outlook afvisede besked" };
    }
  } catch {
    return { ok: false, error: "Netværksfejl – prøv igen" };
  }

  return { ok: false, error: "Ukendt mail-kilde" };
}
