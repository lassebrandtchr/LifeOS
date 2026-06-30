import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard } from "@/features/auth/components/auth-card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "E-mail sendt" };

/**
 * Bekræftelsesside. Vises efter oprettelse af konto eller anmodning om
 * nulstilling af kodeord. I Next.js 16 er `searchParams` en Promise.
 */
export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;

  const description =
    type === "nulstil"
      ? "Vi har sendt dig et link til at nulstille din adgangskode."
      : "Vi har sendt dig et bekræftelseslink til din konto.";

  return (
    <AuthCard title="E-mailen er sendt 📧" description={description}>
      <p className="text-sm text-muted-foreground">
        Kontrollér din indbakke og klik på linket for at fortsætte. Husk at tjekke
        spam-mappen, hvis du ikke kan finde den.
      </p>
      <Button asChild variant="secondary" className="mt-5 w-full">
        <Link href="/login">Tilbage til login</Link>
      </Button>
    </AuthCard>
  );
}
