"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

/**
 * FlashToaster – viser en dansk toast efter en omdirigering.
 *
 * Server Actions kan ikke vise en toast direkte (siden navigerer videre), så
 * de sender i stedet ?flash=... med i URL'en. Denne komponent læser parameteren,
 * viser den rette besked og fjerner derefter parameteren fra adressen igen.
 */
const MESSAGES: Record<string, { type: "success" | "error"; text: string }> = {
  loggedind: { type: "success", text: "Du er nu logget ind." },
  loggedud: { type: "success", text: "Du er nu logget ud." },
  oprettet: { type: "success", text: "Kontoen er oprettet." },
  kodeopdateret: { type: "success", text: "Kodeordet er opdateret." },
  mailsendt: { type: "success", text: "E-mailen er sendt." },
  fejl: { type: "error", text: "Der opstod en fejl. Prøv igen." },
};

export function FlashToaster() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const handled = useRef<string | null>(null);

  const flash = params.get("flash");

  useEffect(() => {
    if (!flash || handled.current === flash) return;
    const message = MESSAGES[flash];
    if (message) {
      handled.current = flash;
      toast[message.type](message.text);
      // Fjern ?flash=... så beskeden ikke gentages ved genindlæsning.
      router.replace(pathname);
    }
  }, [flash, pathname, router]);

  return null;
}
