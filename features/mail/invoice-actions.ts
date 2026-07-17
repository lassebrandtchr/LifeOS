"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getValidAccessToken } from "@/features/integrations/google";
import { parseDanishDueDate } from "@/lib/invoice/due-date";

/**
 * Faktura-påmindelser.
 *
 * En "faktura" er en mail med kategori 'faktura'. Forfaldsdatoen findes sådan:
 *   1) invoice_due_date i databasen (manuelt sat, eller udtrukket fra PDF), ellers
 *   2) udledt fra mailens emne + uddrag ved læsning (parseDanishDueDate).
 * Så virker det, SELV hvis migration 0018 ikke er kørt (så bruges kun tekst-
 * udledningen, og betalt/gemt-forfald springes bare over).
 */

export type InvoiceItem = {
  id: string;
  subject: string;
  from: string;
  receivedAt: string | null;
  /** ISO-dato eller null. */
  dueDate: string | null;
  /** Kom datoen fra et gemt felt (manuelt/PDF) eller fra mailteksten? */
  dueDateSource: "gemt" | "udledt" | null;
  paid: boolean;
  hasPdf: boolean;
};

/** Alle UBETALTE fakturaer (nyeste først). */
export async function getUnpaidInvoices(): Promise<InvoiceItem[]> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    // select("*") + filtrér i JS, så en manglende kolonne (0018 ikke kørt)
    // aldrig får forespørgslen til at fejle.
    const { data, error } = await supabase
      .from("emails")
      .select("*")
      .eq("category", "faktura")
      .order("received_at", { ascending: false, nullsFirst: false })
      .limit(100);
    if (error || !data) return [];

    const items: InvoiceItem[] = [];
    for (const r of data) {
      if (r.invoice_paid === true) continue; // betalt → ikke mind om den
      const stored = (r.invoice_due_date as string | null) ?? null;
      const derived = stored
        ? null
        : parseDanishDueDate(`${r.subject ?? ""} ${r.snippet ?? ""}`);
      items.push({
        id: r.id as string,
        subject: (r.subject as string | null) ?? "(uden emne)",
        from: (r.from_addr as string | null) ?? "",
        receivedAt: (r.received_at as string | null) ?? null,
        dueDate: stored ?? derived,
        dueDateSource: stored ? "gemt" : derived ? "udledt" : null,
        paid: false,
        hasPdf: false, // udfyldes ikke her (kræver et ekstra kald pr. mail)
      });
    }
    return items;
  } catch {
    return [];
  }
}

/** Markér en faktura som betalt / ikke betalt. */
export async function setInvoicePaid(
  emailId: string,
  paid: boolean,
): Promise<{ ok?: true; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Ikke logget ind." };
    const { error } = await supabase
      .from("emails")
      .update({ invoice_paid: paid })
      .eq("id", emailId)
      .eq("user_id", user.id);
    if (error) return { error: "Kør migration 0018 i Supabase for at bruge faktura-funktioner." };
    revalidatePath("/mail");
    revalidatePath("/");
    return { ok: true };
  } catch {
    return { error: "Ukendt fejl." };
  }
}

/** Sæt/ret forfaldsdato manuelt (ISO "2026-07-31", eller null for at rydde). */
export async function setInvoiceDueDate(
  emailId: string,
  isoDate: string | null,
): Promise<{ ok?: true; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Ikke logget ind." };
    const clean = isoDate && /^\d{4}-\d{2}-\d{2}$/.test(isoDate) ? isoDate : null;
    const { error } = await supabase
      .from("emails")
      .update({ invoice_due_date: clean })
      .eq("id", emailId)
      .eq("user_id", user.id);
    if (error) return { error: "Kør migration 0018 i Supabase for at bruge faktura-funktioner." };
    revalidatePath("/mail");
    revalidatePath("/");
    return { ok: true };
  } catch {
    return { error: "Ukendt fejl." };
  }
}

/**
 * Læser fakturaens PDF-vedhæftning og forsøger at finde forfaldsdatoen i den.
 * Best effort: virker på PDF'er MED tekstlag, ikke på rene billed-/skan-PDF'er.
 * Gemmer den fundne dato (hvis nogen) og returnerer den.
 */
export async function extractInvoiceDueDateFromPdf(
  emailId: string,
): Promise<{ dueDate?: string | null; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Ikke logget ind." };

    const { data } = await supabase
      .from("emails")
      .select("external_id, source, workspace")
      .eq("id", emailId)
      .maybeSingle();
    if (!data?.external_id) return { error: "Mail ikke fundet." };

    const source =
      (data.source as string | null) ?? ((data.workspace as string) === "work" ? "outlook" : "gmail");
    // Faktura-PDF-læsning understøttes for Gmail (privat indbakke).
    if (source !== "gmail") {
      return { error: "PDF-læsning understøttes indtil videre kun for Gmail." };
    }

    const token = await getValidAccessToken();
    if (!token) return { error: "Gmail er ikke forbundet." };

    // 1) Find PDF-vedhæftningen i beskeden.
    const msgRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${data.external_id}?format=full`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
    );
    if (!msgRes.ok) return { error: "Kunne ikke hente mailen." };
    const msg = await msgRes.json();

    type Part = {
      mimeType?: string;
      filename?: string;
      body?: { attachmentId?: string };
      parts?: Part[];
    };
    let pdfAttId: string | null = null;
    const walk = (p: Part) => {
      const isPdf =
        p.mimeType === "application/pdf" || (p.filename && /\.pdf$/i.test(p.filename));
      if (isPdf && p.body?.attachmentId && !pdfAttId) pdfAttId = p.body.attachmentId;
      for (const c of p.parts ?? []) walk(c);
    };
    walk((msg.payload ?? {}) as Part);
    if (!pdfAttId) return { error: "Ingen PDF-vedhæftning fundet på fakturaen." };

    // 2) Hent PDF-bytes.
    const attRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${data.external_id}/attachments/${pdfAttId}`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
    );
    if (!attRes.ok) return { error: "Kunne ikke hente PDF'en." };
    const attJson = await attRes.json();
    if (!attJson.data) return { error: "Tom PDF." };
    const bytes = new Uint8Array(Buffer.from(attJson.data as string, "base64url"));

    // 3) Udtræk tekst og find forfaldsdato.
    const { extractText } = await import("unpdf");
    const { text } = await extractText(bytes, { mergePages: true });
    const merged = Array.isArray(text) ? text.join(" ") : text;
    const due = parseDanishDueDate(merged);
    if (!due) {
      return {
        error:
          "Kunne ikke finde en forfaldsdato i PDF'en (den er måske indskannet som billede). Skriv datoen manuelt.",
      };
    }

    // 4) Gem den fundne dato (defensivt – kolonnen kan mangle).
    await supabase
      .from("emails")
      .update({ invoice_due_date: due })
      .eq("id", emailId)
      .eq("user_id", user.id);

    revalidatePath("/mail");
    revalidatePath("/");
    return { dueDate: due };
  } catch {
    return { error: "Kunne ikke læse PDF'en." };
  }
}
