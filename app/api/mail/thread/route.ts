import { NextResponse } from "next/server";

import {
  getEmailThread,
  getEmailThreadByExternalId,
  type EmailThread,
} from "@/features/mail/actions";

/**
 * HENT HELE MAILEN (tråden) – som et almindeligt API-kald, IKKE en Server Action.
 *
 * HVORFOR et API-endpoint i stedet for en Server Action?
 * En Server Action sender sit svar tilbage gennem Next' "React Server
 * Components"-kanal. Går NOGET galt i den kanal – fx når svaret pakkes, eller
 * når Next bagefter gen-tegner de sider, en `revalidatePath` har markeret –
 * så fejler HELE kaldet, og Next erstatter fejlteksten i produktion med den
 * ubrugelige "An error occurred in the Server Components render. The specific
 * message is omitted in production builds…". Den fejl sker UDEN FOR vores egen
 * try/catch inde i handlingen, så vi kunne ikke fange den – og mailen endte
 * hver gang som "kun uddrag" med en fejl, vi ikke kunne læse.
 *
 * Et route handler returnerer derimod almindelig JSON: ingen RSC-pakning,
 * ingen gen-tegning af sider, og vi bestemmer selv svaret 100 %. Går noget
 * galt, sender vi den ÆGTE fejltekst med (status 200, så læseren altid kan
 * vise mailen – med uddrag + en præcis årsag i stedet for en tavs fejl).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Body = {
  id?: string;
  externalId?: string | null;
  /** Åbnet fra en Gmail-mappe (ingen database-række) – hent direkte på Gmail-id. */
  readOnly?: boolean;
};

export async function POST(request: Request) {
  let thread: EmailThread | null = null;
  try {
    const body = (await request.json()) as Body;
    const id = body.id;
    const externalId = body.externalId ?? null;
    if (!id && !externalId) {
      return NextResponse.json({ thread: null, error: "mangler mail-id" });
    }

    thread = body.readOnly
      ? await getEmailThreadByExternalId(externalId ?? (id as string))
      : await getEmailThread(id as string, externalId);

    return NextResponse.json({ thread, error: thread?.loadError ?? null });
  } catch (e) {
    // ÆGTE årsag med tilbage (denne tekst redigeres ikke væk, fordi vi selv
    // skriver den ind i et almindeligt JSON-svar).
    console.error("[api/mail/thread] fejl:", e);
    const digest = (e as { digest?: string })?.digest;
    const message =
      e instanceof Error ? e.message : typeof e === "string" ? e : "ukendt serverfejl";
    return NextResponse.json({
      thread: null,
      error: `${message}${digest ? ` [digest ${digest}]` : ""}`,
    });
  }
}
