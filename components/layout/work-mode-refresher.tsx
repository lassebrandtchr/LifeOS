"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { isWorkHours } from "@/features/tasks/section-order";

/**
 * Holder øje med arbejdstids-grænsen (08.45/17.00 hverdage, 12–16 søndag) og
 * genindlæser server-data i det øjeblik den krydses, så forsiden skifter
 * DYNAMISK mellem arbejde/privat (grøn badge, Action-liste, indbakke m.m.)
 * uden at Lasse selv skal genindlæse siden. Tjekker hvert 30. sekund –
 * billigt (ren lokal udregning, ingen netværk før grænsen reelt krydses).
 */
export function WorkModeRefresher() {
  const router = useRouter();
  const lastValue = React.useRef<boolean | null>(null);

  React.useEffect(() => {
    lastValue.current = isWorkHours();
    const id = setInterval(() => {
      const now = isWorkHours();
      if (lastValue.current !== null && now !== lastValue.current) {
        router.refresh();
      }
      lastValue.current = now;
    }, 30_000);
    return () => clearInterval(id);
  }, [router]);

  return null;
}
