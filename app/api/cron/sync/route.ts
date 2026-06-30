import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { runAutomaticSync } from "@/features/integrations/cron-sync";

/**
 * AUTOMATISK SYNK-ENDPOINT – kaldes af Vercel Cron hver 30. min.
 *
 * Sikkerhed: Vercel sender automatisk "Authorization: Bearer <CRON_SECRET>"
 * når CRON_SECRET er sat som miljøvariabel. Vi afviser alt andet, så ingen
 * udefra kan starte synken.
 *
 * Kan også køres manuelt i en browser/terminal med samme Bearer-token.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  // Hvis ingen hemmelighed er sat (fx lokalt), tillad – så man kan teste.
  if (!secret) return true;
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

async function handle(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "Uautoriseret" }, { status: 401 });
  }

  const summary = await runAutomaticSync();

  // Genopfrisk de sider, der viser synket data.
  for (const path of [
    "/",
    "/mail",
    "/kalender",
    "/opgaver",
    "/storgaard-biler",
    "/privat",
    "/markedsfoering",
    "/indstillinger",
  ]) {
    try {
      revalidatePath(path);
    } catch {
      // revalidatePath kan smide hvis stien ikke findes – ufarligt.
    }
  }

  return NextResponse.json(summary, { status: summary.ok ? 200 : 500 });
}

export async function GET(request: Request) {
  return handle(request);
}

// Vercel Cron bruger GET, men vi tillader også POST (fx fra egne scripts).
export async function POST(request: Request) {
  return handle(request);
}
