"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getValidAccessToken } from "@/features/integrations/google";
import { categorizeEmail } from "@/features/integrations/categorize";
import {
  listGmailFolders,
  listGmailMessagesByLabel,
  modifyGmailLabels,
  trashGmailMessage,
  getGmailSignature,
  type GmailFolder,
} from "@/lib/google/gmail";
import type { MailMessage } from "@/features/integrations/types";

function revalidateMail() {
  revalidatePath("/mail");
  revalidatePath("/");
  revalidatePath("/privat");
}

async function auth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { supabase, userId: user.id } : null;
}

// ───────────────────────── Kategorisér alle eksisterende ─────────────────────

/**
 * Kategoriserer ALLE eksisterende mails i databasen (ikke kun nye ved synk).
 * Kører reglerne på afsender/emne/uddrag, så ingen mail står ukategoriseret.
 * Rører kun rækker, hvor kategorien reelt ændres.
 */
export async function recategorizeAllEmails(): Promise<{
  ok?: true;
  updated?: number;
  error?: string;
}> {
  const a = await auth();
  if (!a) return { error: "Ikke logget ind." };
  try {
    const { data, error } = await a.supabase
      .from("emails")
      .select("id, from_addr, subject, snippet, category")
      .eq("user_id", a.userId)
      .limit(1000);
    if (error || !data) return { error: "Kunne ikke læse mails." };

    let updated = 0;
    for (const r of data) {
      const next = categorizeEmail({
        from: (r.from_addr as string | null) ?? "",
        subject: r.subject as string | null,
        snippet: r.snippet as string | null,
      });
      if (next && next !== r.category) {
        await a.supabase.from("emails").update({ category: next }).eq("id", r.id as string);
        updated++;
      }
    }
    revalidateMail();
    return { ok: true, updated };
  } catch {
    return { error: "Kunne ikke kategorisere." };
  }
}

// ─────────────────────────── Arkivér / slet / flyt ───────────────────────────

/**
 * Fælles: find mailens Gmail-id + token.
 *
 * ROBUST mod forældede DB-id'er: slår først op på DB-uuid'et, men falder tilbage
 * til det STABILE external_id (Gmail-beskedens eget id). Efter en synk kan
 * DB-uuid'et være skiftet, eller mailen kan være faldet ud af de synkede top-25
 * – men external_id peger altid på den rigtige mail i Gmail. `externalIdHint`
 * sendes af UI'et (det ligger på mail-objektet), så handlinger som slet/arkivér
 * virker selv om DB-rækken ikke længere kan findes på id.
 */
async function gmailContext(emailId: string, externalIdHint?: string | null) {
  const a = await auth();
  if (!a) return { error: "Ikke logget ind." as const };
  const cols = "id, external_id, source, workspace";
  let row =
    (
      await a.supabase
        .from("emails")
        .select(cols)
        .eq("id", emailId)
        .eq("user_id", a.userId)
        .maybeSingle()
    ).data;
  if (!row && externalIdHint) {
    row = (
      await a.supabase
        .from("emails")
        .select(cols)
        .eq("external_id", externalIdHint)
        .eq("user_id", a.userId)
        .maybeSingle()
    ).data;
  }
  const externalId = (row?.external_id as string | null) ?? externalIdHint ?? null;
  if (!externalId) return { error: "Mail ikke fundet." as const };
  const source =
    (row?.source as string | null) ??
    ((row?.workspace as string) === "work" ? "outlook" : "gmail");
  if (source !== "gmail") return { error: "Understøttes indtil videre kun for Gmail." as const };
  const token = await getValidAccessToken();
  if (!token) return { error: "Gmail er ikke forbundet." as const };
  return { a, token, externalId, dbId: (row?.id as string | null) ?? null };
}

/** Arkivér: fjern fra indbakken (beholdes i Gmail under Al post). */
export async function archiveEmail(
  emailId: string,
  externalId?: string | null,
): Promise<{ ok?: true; error?: string }> {
  const ctx = await gmailContext(emailId, externalId);
  if ("error" in ctx) return { error: ctx.error };
  const ok = await modifyGmailLabels(ctx.token, ctx.externalId, { remove: ["INBOX"] });
  if (!ok) return { error: "Kunne ikke arkivere i Gmail." };
  // Fjern fra den lokale indbakke-visning (den er ikke i indbakken længere).
  if (ctx.dbId) {
    await ctx.a.supabase.from("emails").delete().eq("id", ctx.dbId).eq("user_id", ctx.a.userId);
  }
  revalidateMail();
  return { ok: true };
}

/** Slet: flyt til Gmails papirkurv (kan gendannes i 30 dage). */
export async function trashEmail(
  emailId: string,
  externalId?: string | null,
): Promise<{ ok?: true; error?: string }> {
  const ctx = await gmailContext(emailId, externalId);
  if ("error" in ctx) return { error: ctx.error };
  const ok = await trashGmailMessage(ctx.token, ctx.externalId);
  if (!ok) return { error: "Kunne ikke slette i Gmail." };
  if (ctx.dbId) {
    await ctx.a.supabase.from("emails").delete().eq("id", ctx.dbId).eq("user_id", ctx.a.userId);
  }
  revalidateMail();
  return { ok: true };
}

/**
 * Flyt en mail til en Gmail-mappe (label). Tilføjer mappens label og fjerner
 * INBOX (= flyt ud af indbakken, som i Gmail). Bruges af træk-og-slip.
 */
export async function moveEmailToFolder(
  emailId: string,
  folderId: string,
): Promise<{ ok?: true; error?: string }> {
  const ctx = await gmailContext(emailId);
  if ("error" in ctx) return { error: ctx.error };
  const ok = await modifyGmailLabels(ctx.token, ctx.externalId, {
    add: [folderId],
    remove: ["INBOX"],
  });
  if (!ok) return { error: "Kunne ikke flytte mailen i Gmail." };
  if (ctx.dbId) {
    await ctx.a.supabase.from("emails").delete().eq("id", ctx.dbId).eq("user_id", ctx.a.userId);
  }
  revalidateMail();
  return { ok: true };
}

/** Videresend en mail til en ny modtager (med valgfri kommentar). */
export async function forwardEmail(
  emailId: string,
  to: string,
  note: string,
  externalId?: string | null,
): Promise<{ ok?: true; error?: string }> {
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to.trim())) {
    return { error: "Skriv en gyldig modtager-e-mail." };
  }
  const ctx = await gmailContext(emailId, externalId);
  if ("error" in ctx) return { error: ctx.error };

  try {
    // Hent den originale mails emne + HTML-krop, så den videresendes komplet.
    const res = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${ctx.externalId}?format=full`,
      { headers: { Authorization: `Bearer ${ctx.token}` }, cache: "no-store" },
    );
    if (!res.ok) return { error: "Kunne ikke hente den originale mail." };
    const msg = await res.json();
    const headers = (msg.payload?.headers ?? []) as { name?: string; value?: string }[];
    const getH = (n: string) =>
      headers.find((h) => h.name?.toLowerCase() === n.toLowerCase())?.value ?? "";
    const origSubject = getH("Subject");
    const origFrom = getH("From");
    const origDate = getH("Date");

    // Find HTML- eller tekst-krop.
    type Part = { mimeType?: string; body?: { data?: string }; parts?: Part[] };
    let bodyHtml = "";
    const walk = (p: Part) => {
      if (!bodyHtml && p.mimeType === "text/html" && p.body?.data) {
        bodyHtml = Buffer.from(p.body.data, "base64url").toString("utf-8");
      }
      for (const c of p.parts ?? []) walk(c);
    };
    walk((msg.payload ?? {}) as Part);
    if (!bodyHtml) bodyHtml = `<p>${(msg.snippet as string) ?? ""}</p>`;

    const signature = await getGmailSignature(ctx.token);
    const noteHtml = note.trim()
      ? `<div>${note.trim().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>")}</div><br>`
      : "";
    const forwardHtml =
      `${noteHtml}${signature ? `${signature}<br>` : ""}` +
      `<br><div style="border-left:2px solid #ccc;padding-left:12px;color:#555">` +
      `<p>---------- Videresendt besked ----------<br>` +
      `Fra: ${origFrom}<br>Dato: ${origDate}<br>Emne: ${origSubject}</p>${bodyHtml}</div>`;

    const b64Body = Buffer.from(forwardHtml, "utf-8").toString("base64");
    const lines = [
      `To: ${to.trim()}`,
      `Subject: Fwd: ${origSubject}`,
      "MIME-Version: 1.0",
      "Content-Type: text/html; charset=utf-8",
      "Content-Transfer-Encoding: base64",
      "",
      b64Body,
    ];
    const raw = Buffer.from(lines.join("\r\n")).toString("base64url");

    const sendRes = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${ctx.token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ raw }),
      },
    );
    return sendRes.ok ? { ok: true } : { error: "Gmail afviste videresendelsen." };
  } catch {
    return { error: "Kunne ikke videresende – prøv igen." };
  }
}

// ─────────────────────────────── Mapper ──────────────────────────────────────

export type { GmailFolder };

/** Sundhedstjek på Google-forbindelsen (til præcis fejlbesked i mail-UI'et). */
export async function googleHealth() {
  const { getGoogleHealth } = await import("@/features/integrations/google");
  return getGoogleHealth();
}

/**
 * Alle Gmail-mapper (labels) til sidebaren + en PRÆCIS årsag hvis det fejler.
 * reason indeholder Googles egen fejlbesked (fx "insufficient authentication
 * scopes"), så vi kan vise hvad der REELT er galt i stedet for at gætte.
 */
export async function getGmailFolders(): Promise<{
  folders: GmailFolder[];
  error?: string;
}> {
  // ALT er inde i try (også auth()), så denne server-action ALDRIG kaster en
  // 500 op til klienten – den returnerer i stedet en pæn fejl. En 500 på
  // POST /mail var netop symptomet: getGmailFolders (en server-action) kastede
  // ukontrolleret. console.error sikrer, at den rigtige stak stadig ses i
  // Vercel-loggen.
  try {
    const a = await auth();
    if (!a) return { folders: [], error: "ikke logget ind" };
    const token = await getValidAccessToken();
    if (!token) return { folders: [], error: "forbindelse udløbet" };
    const folders = await listGmailFolders(token);
    return { folders };
  } catch (e) {
    console.error("[getGmailFolders] fejlede:", e);
    const { GmailApiError } = await import("@/lib/google/gmail");
    if (e instanceof GmailApiError) {
      return { folders: [], error: `${e.status}: ${e.reason || "ukendt Gmail-fejl"}` };
    }
    return { folders: [], error: e instanceof Error ? e.message : "netværksfejl" };
  }
}

/** Mails i en bestemt mappe (live fra Gmail), som MailMessage til visning. */
export async function getFolderEmails(folderId: string): Promise<MailMessage[]> {
  const a = await auth();
  if (!a) return [];
  try {
    const token = await getValidAccessToken();
    if (!token) return [];
    const msgs = await listGmailMessagesByLabel(token, folderId, 40);
    return msgs.map((m) => ({
      id: m.id, // BEMÆRK: Gmail-besked-id (ikke et DB-id) – se folder-visningen.
      externalId: m.id,
      subject: m.subject,
      snippet: m.snippet,
      from: m.from ?? "",
      isRead: m.isRead,
      replied: false,
      category: categorizeEmail({ from: m.from ?? "", subject: m.subject, snippet: m.snippet, labelIds: m.labelIds }),
      invoiceDueDate: null,
      invoicePaid: false,
      source: "gmail",
      workspace: "private",
      receivedAt: m.receivedISO,
    }));
  } catch {
    return [];
  }
}
