import { NextResponse } from "next/server";
import { getBilinfoDebug } from "@/lib/bilinfo/client";

/**
 * MIDLERTIDIG diagnose-rute. Viser om produktions-serveren kan se
 * Bilinfo-credentials og hente feedet – uden at lække selve
 * loginoplysninger eller bildetaljer. Fjernes igen når fejlen er fundet.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getBilinfoDebug());
}
