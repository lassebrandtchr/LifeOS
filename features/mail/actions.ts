"use server";

import { createClient } from "@/lib/supabase/server";
import { getValidAccessToken } from "@/features/integrations/google";
import { getValidMicrosoftToken } from "@/features/integrations/microsoft";

// ─── Types ────────────────────────────────────────────────────────────────────

export type EmailDetail = {
  id: string;
  subject: string | null;
  from_addr: string | null;
  workspace: string;
  received_at: string | null;
  snippet: string | null;
  body: string | null;
  external_id: string | null;
};

export type ReplyResult = { ok: boolean; error?: string };

// ─── Gmail helpers ────────────────────────────────────────────────────────────

type GmailPart = {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailPart[];
};

function extractGmailText(part: GmailPart): string {
  if (part.mimeType === "text/plain" && part.body?.data) {
    return Buffer.from(part.body.data, "base64url").toString("utf-8");
  }
  if (part.mimeType === "text/html" && part.body?.data && !part.parts?.length) {
    const html = Buffer.from(part.body.data, "base64url").toString("utf-8");
    return html.replace(/<[^>]+>/g, " ").replace(/\s{2,}/g, " ").trim();
  }
  for (const p of part.parts ?? []) {
    const text = extractGmailText(p);
    if (text) return text;
  }
  return "";
}

// ─── Server actions ───────────────────────────────────────────────────────────

/** Henter mail-detaljer fra Supabase og forsøger at hente brødtekst fra kilden. */
export async function getEmailDetail(emailId: string): Promise<EmailDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("emails")
    .select("id, subject, from_addr, workspace, received_at, snippet, external_id")
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
    body: null,
  };

  if (!base.external_id) return base;

  try {
    if (base.workspace === "private") {
      const token = await getValidAccessToken();
      if (!token) return base;
      const res = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${base.external_id}?format=full`,
        { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
      );
      if (res.ok) {
        const msg = await res.json();
        const text = extractGmailText((msg.payload ?? {}) as GmailPart);
        base.body = text || (msg.snippet as string | null) || null;
      }
    } else if (base.workspace === "work") {
      const token = await getValidMicrosoftToken();
      if (!token) return base;
      const res = await fetch(
        `https://graph.microsoft.com/v1.0/me/messages/${base.external_id}?$select=body`,
        { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
      );
      if (res.ok) {
        const msg = await res.json();
        const html = (msg.body?.content as string) ?? "";
        base.body = html.replace(/<[^>]+>/g, " ").replace(/\s{2,}/g, " ").trim() || null;
      }
    }
  } catch {
    // falder tilbage til snippet
  }

  return base;
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
    .select("workspace, from_addr, subject, external_id")
    .eq("id", emailId)
    .maybeSingle();

  if (!data?.external_id) return { ok: false, error: "Mail ikke fundet" };

  const externalId = data.external_id as string;
  const workspace = data.workspace as string;

  try {
    if (workspace === "private") {
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

      const lines = [
        `To: ${toAddr}`,
        `Subject: ${subject}`,
        ...(messageId ? [`In-Reply-To: ${messageId}`, `References: ${messageId}`] : []),
        "Content-Type: text/plain; charset=utf-8",
        "MIME-Version: 1.0",
        "",
        replyText,
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

    if (workspace === "work") {
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

  return { ok: false, error: "Ukendt workspace" };
}
