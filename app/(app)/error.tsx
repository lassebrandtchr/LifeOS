"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Fejl-grænse for alle sider inde i appen (forside, Storgaard, Privat,
 * Opgaver, Kalender, Mail …).
 *
 * HVORFOR: uden denne fil betyder ÉN enkelt fejl i en komponent, at hele
 * skærmen bliver hvid ("Application error") og appen skal lukkes helt ned og
 * åbnes igen. Det er præcis dét, der føltes som at appen "crasher" – især på
 * mobil, hvor et afbrudt netværk let kan udløse en fejl.
 *
 * Med denne fil bliver en fejl i stedet til et venligt kort med en
 * "Prøv igen"-knap (reset() gen-renderer siden UDEN at genindlæse hele
 * appen), så man altid kan komme videre.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  // Log til konsollen, så en fejl stadig kan spores (fx via Vercel-logs),
  // selvom brugeren ser en pæn besked i stedet for et hvidt skærmbillede.
  React.useEffect(() => {
    console.error("[LifeOS] Sidefejl:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-card border border-border/70 bg-card p-6 text-center shadow-soft">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-warning/15 text-warning">
          <AlertTriangle className="size-6" />
        </span>

        <h1 className="mt-4 text-lg font-semibold">Ups – noget gik galt</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Siden kunne ikke vises lige nu. Det skyldes oftest en kortvarig
          forbindelsesfejl. Dine data er ikke gået tabt.
        </p>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button onClick={() => reset()}>
            <RefreshCw className="size-4" />
            Prøv igen
          </Button>
          <Button variant="outline" onClick={() => router.push("/")}>
            <Home className="size-4" />
            Gå til forsiden
          </Button>
        </div>

        {error.digest && (
          <p className="mt-4 text-[11px] text-muted-foreground/70">
            Fejl-id: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
